import * as THREE from "three";
import { ALIEN_RENDER_DISTANCE, SpaceAlien } from "./space-alien.js";
import { overlapsCircle } from "../core/physics.js";

export const ALIEN_COUNT = 5;
export const RESPAWN_SECONDS = 2.5;
const RANGE = 42;

// Distance along a ray to a collider; the same test clips shots and target selection.
export function rayBoxDistance(origin, direction, box) {
  let near = 0,
    far = RANGE;
  for (const [axis, min, max] of [
    ["x", "minX", "maxX"],
    ["y", "minY", "maxY"],
    ["z", "minZ", "maxZ"],
  ]) {
    const lo = box[min] ?? -Infinity,
      hi = box[max] ?? Infinity;
    if (Math.abs(direction[axis]) < 1e-8) {
      if (origin[axis] < lo || origin[axis] > hi) return Infinity;
    } else {
      const a = (lo - origin[axis]) / direction[axis],
        b = (hi - origin[axis]) / direction[axis];
      near = Math.max(near, Math.min(a, b));
      far = Math.min(far, Math.max(a, b));
      if (near > far) return Infinity;
    }
  }
  return near;
}

function armBones(model) {
  const get = (...names) =>
    names.map((n) => model.getObjectByName(n)).find(Boolean);
  return [
    get("DEF-upper_armR", "UpperArmR"),
    get("DEF-forearmR", "ForearmR"),
    get("DEF-handR", "HandR"),
  ];
}

// Pose after locomotion so all three rigs can aim while walking or running.
export function aimBlasterArm(model, direction, recoil = 0) {
  const [upper, lower, hand] = armBones(model);
  if (!upper || !lower || !hand) return null;
  model.updateMatrixWorld(true);
  for (const [joint, child] of [
    [upper, lower],
    [lower, hand],
  ]) {
    const here = joint.getWorldPosition(new THREE.Vector3());
    const from = child
      .getWorldPosition(new THREE.Vector3())
      .sub(here)
      .normalize();
    const to = direction
      .clone()
      .add(
        new THREE.Vector3(
          0,
          joint === upper ? -0.2 + recoil : 0.15 + recoil,
          0,
        ),
      )
      .normalize();
    const q = joint
      .getWorldQuaternion(new THREE.Quaternion())
      .premultiply(new THREE.Quaternion().setFromUnitVectors(from, to));
    joint.quaternion.copy(
      joint.parent
        .getWorldQuaternion(new THREE.Quaternion())
        .invert()
        .multiply(q),
    );
    model.updateMatrixWorld(true);
  }
  return hand.getWorldPosition(new THREE.Vector3());
}

function blaster() {
  const g = new THREE.Group();
  g.name = "player-space-blaster";
  const add = (w, h, d, x, y, z, color) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.4,
        metalness: 0.35,
      }),
    );
    m.position.set(x, y, z);
    g.add(m);
  };
  add(0.25, 0.23, 0.65, 0, 0.1, 0.22, 0x4d6f8c);
  add(0.15, 0.27, 0.17, 0, -0.08, 0, 0xf4cb74);
  add(0.16, 0.12, 0.23, 0, 0.23, 0.12, 0x92e6dc);
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x9effef }),
  );
  flash.position.set(0, 0.1, 0.62);
  flash.visible = false;
  g.add(flash);
  g.userData.flash = flash;
  return g;
}

export class SpaceCombat {
  constructor(game, template) {
    this.game = game;
    this.enabled = true;
    this.defeated = 0;
    this.cooldown = 0;
    this.recoil = 0;
    this.shotRequested = false;
    this.spawnSerial = 0;
    this.aliens = Array.from(
      { length: ALIEN_COUNT },
      () => new SpaceAlien(game, template, { hud: false, notifyTag: false }),
    );
    this.gun = blaster();
    game.scene.add(this.gun);
    this.gun.visible = false;
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 1, 8),
      new THREE.MeshBasicMaterial({ color: 0x97fff0 }),
    );
    this.beam.visible = false;
    this.beamTime = 0;
    this.bubbles = new Map();
    game.scene.add(this.beam);
    this.hud = globalThis.document?.querySelector("#alien-hud");
    this.status = globalThis.document?.querySelector("#alien-status");
    this.toggleButton = globalThis.document?.querySelector("#alien-toggle");
    this.fireButton = globalThis.document?.querySelector("#alien-fire");
    this.toggleButton?.addEventListener("click", () => {
      this.enabled = !this.enabled;
      game.input?.clear();
      this.shotRequested = false;
      this.refresh();
      game.canvas?.focus();
    });
    this.fireButton?.addEventListener("click", () => {
      this.shotRequested = true;
      game.canvas?.focus();
    });
    this.reset();
  }
  spawn(alien, index) {
    const area = this.game.areas.space,
      b = area.bounds;
    for (let attempt = 0; attempt < 80; attempt++) {
      const edge = (index + this.spawnSerial + attempt) % 4;
      const t =
        0.12 +
        ((index * 0.197 + this.spawnSerial * 0.137 + attempt * 0.091) % 0.76);
      const x =
        edge === 0
          ? b.minX + 2
          : edge === 1
            ? b.maxX - 2
            : THREE.MathUtils.lerp(b.minX + 2, b.maxX - 2, t);
      const z =
        edge === 2
          ? b.minZ + 2
          : edge === 3
            ? b.maxZ - 2
            : THREE.MathUtils.lerp(b.minZ + 2, b.maxZ - 2, t);
      if (
        area.colliders.some(
          (c) =>
            c.maxY > area.groundY &&
            (c.minY ?? 0) < area.groundY + 2.3 &&
            overlapsCircle(x, z, 1, c),
        )
      )
        continue;
      if (
        this.aliens.some(
          (a) =>
            a !== alien &&
            a.model?.position.distanceTo(
              new THREE.Vector3(x, area.groundY, z),
            ) < 2,
        )
      )
        continue;
      alien.reset();
      alien.model.position.set(x, area.groundY, z);
      alien.model.scale.setScalar(1);
      alien.model.rotation.x = 0;
      alien.delay = 1.2;
      alien.respawn = 0;
      alien.tagTime = 0;
      alien.model.visible = true;
      this.spawnSerial++;
      return;
    }
    throw new Error("No clear alien spawn at the space boundary");
  }
  reset() {
    this.cooldown = 0;
    this.recoil = 0;
    this.beamTime = 0;
    this.shotRequested = false;
    this.beam.visible = false;
    for (const bubble of this.bubbles.values()) this.game.scene.remove(bubble);
    this.bubbles.clear();
    this.gun.visible = false;
    this.aliens.forEach((a, i) => {
      if (a.model) this.spawn(a, i);
      if (a.model) a.model.visible = false;
    });
  }
  canPlay() {
    const g = this.game;
    return (
      g.area.id === "space" &&
      g.mode === "playing" &&
      !g.playground?.active &&
      !g.spaceDive?.occupied &&
      !g.player.inVehicle
    );
  }
  update(dt) {
    const g = this.game,
      space = g.area.id === "space";
    const active = this.canPlay();
    if (this.hud)
      this.hud.hidden =
        !space ||
        !!g.player.inVehicle ||
        g.mode !== "playing" ||
        !!g.playground?.active ||
        !!g.spaceDive?.occupied;
    this.gun.visible = active && this.enabled;
    if (!space) {
      this.beam.visible = false;
      this.aliens.forEach((a) => {
        if (a.model) a.model.visible = false;
      });
      return;
    }
    if (g.mode !== "playing") return;
    dt = Math.min(Math.max(dt, 0), 0.05);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.recoil = Math.max(0, this.recoil - dt);
    this.beamTime = Math.max(0, this.beamTime - dt);
    this.beam.visible = this.beamTime > 0;
    this.aliens.forEach((a, i) => {
      if (!a.model) return;
      if (a.respawn > 0) {
        const bubble = this.bubbles.get(a);
        if (bubble && active && this.enabled) {
          bubble.position.addScaledVector(a.bubbleVelocity, dt);
          bubble.rotation.y += dt * 1.4;
          bubble.rotation.x += dt * 0.6;
          a.model.position.copy(bubble.position);
          a.model.visible =
            a.model.position.distanceToSquared(g.player.position) <=
            ALIEN_RENDER_DISTANCE ** 2;
          const b = g.area.bounds;
          if (
            bubble.position.y > g.area.groundY + 58 ||
            bubble.position.x < b.minX - 4 ||
            bubble.position.x > b.maxX + 4 ||
            bubble.position.z < b.minZ - 4 ||
            bubble.position.z > b.maxZ + 4
          ) {
            g.scene.remove(bubble);
            this.bubbles.delete(a);
            a.model.visible = false;
            a.respawn = 0;
            this.spawn(a, i);
          }
        }
        return;
      }
      a.enabled = this.enabled && active;
      a.update(dt);
      if (a.state === "tagged" && active && this.enabled) {
        a.tagTime += dt;
        if (a.tagTime > 1.5) {
          a.state = "waiting";
          a.delay = 0.8;
          a.tagTime = 0;
        }
      }
    });
    this.refresh();
  }
  refresh() {
    const text = !this.enabled
      ? "Alien chase paused. Explore at your own pace."
      : `Bubble launcher · ${ALIEN_COUNT} aliens · ${this.defeated} bubbled. B to fire; float aliens out of space. They return at the edge.`;
    if (this.status && this.status.textContent !== text)
      this.status.textContent = text;
    if (this.toggleButton)
      this.toggleButton.textContent = this.enabled
        ? "Pause alien chase"
        : "Resume alien chase";
    if (this.fireButton) this.fireButton.disabled = !this.enabled;
  }
  afterPlayer(dt) {
    const g = this.game;
    const fire = g.input.consume("KeyB") || this.shotRequested;
    this.shotRequested = false;
    if (!this.canPlay() || !this.enabled) {
      this.gun.visible = false;
      return;
    }
    const direction = new THREE.Vector3(
      Math.sin(g.player.heading),
      0,
      Math.cos(g.player.heading),
    );
    const hand = aimBlasterArm(g.player.model, direction, this.recoil * 1.8);
    if (!hand) {
      this.gun.visible = false;
      return;
    }
    this.gun.visible = true;
    this.gun.position
      .copy(hand)
      .addScaledVector(direction, -this.recoil * 0.18);
    this.gun.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      direction,
    );
    this.gun.userData.flash.visible = this.recoil > 0.12 && !g.calm;
    if (fire && this.cooldown === 0) {
      this.fire(hand.clone().addScaledVector(direction, 0.65), direction);
      this.cooldown = 0.32;
      this.recoil = 0.22;
    }
  }
  fire(origin, forward) {
    const area = this.game.areas.space;
    this.game.audio?.oneShot("bubble", this.game.calm ? 0.12 : 0.22);
    let chosen = null,
      best = Infinity,
      aim = forward.clone();
    for (const alien of this.aliens) {
      if (!alien.model || alien.respawn > 0) continue;
      const target = alien.model.position
        .clone()
        .add(new THREE.Vector3(0, 1.1, 0));
      const offset = target.sub(origin),
        distance = offset.length(),
        direction = offset.normalize();
      if (distance > RANGE || distance >= best || direction.dot(forward) < 0.86)
        continue;
      if (
        area.colliders.some(
          (c) => rayBoxDistance(origin, direction, c) < distance,
        )
      )
        continue;
      best = distance;
      chosen = alien;
      aim = direction;
    }
    let distance = chosen ? best : RANGE;
    for (const c of area.colliders)
      distance = Math.min(distance, rayBoxDistance(origin, aim, c));
    this.beam.position.copy(origin).addScaledVector(aim, distance / 2);
    this.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), aim);
    this.beam.scale.set(1, Math.max(0.01, distance), 1);
    this.beam.visible = true;
    this.beamTime = 0.14;
    if (chosen) {
      const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(1.55, 24, 16),
        new THREE.MeshPhysicalMaterial({
          color: 0x9fe9ff,
          transparent: true,
          opacity: 0.28,
          roughness: 0.05,
          metalness: 0,
          transmission: 0.35,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      bubble.name = "alien-bubble";
      bubble.position
        .copy(chosen.model.position)
        .add(new THREE.Vector3(0, 1.45, 0));
      this.game.scene.add(bubble);
      this.bubbles.set(chosen, bubble);
      chosen.respawn = 1;
      chosen.state = "bubbled";
      chosen.bubbleVelocity = aim.clone().multiplyScalar(4.4);
      chosen.bubbleVelocity.y = 4.8;
      chosen.model.position.copy(bubble.position);
      chosen.model.animator?.mixer.stopAllAction();
      this.defeated++;
    }
    this.refresh();
    return chosen;
  }
}
