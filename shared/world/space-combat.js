import * as THREE from "three";
import { ALIEN_RENDER_DISTANCE, SpaceAlien } from "./space-alien.js";
import { overlapsCircle } from "../core/physics.js";
import {
  buildBubbleArena,
  insideBubbleArena,
  arenaSafeZone,
  BUBBLE_ARENA_START,
  BUBBLE_ARENA_EXIT,
  CROWD_SECONDS,
  CROWD_DISTANCE,
} from "./bubble-arena.js";

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
    this.arena = buildBubbleArena(game.areas.space);
    this.crowdTime = 0;
    this.grace = 0;
    this.wasInside = false;
    this.resetCount = 0;
    this.aliens = Array.from(
      { length: ALIEN_COUNT },
      () => new SpaceAlien(game, template, { hud: false, notifyTag: false }),
    );
    this.aliens.forEach((alien) => {
      alien.navigationArea = this.arena;
    });
    this.gun = blaster();
    game.scene.add(this.gun);
    this.gun.visible = false;
    this.bubbleGeometry = new THREE.SphereGeometry(1.55, 24, 16);
    this.bubbleMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x9fe9ff,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      metalness: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.beam = new THREE.Group();
    this.beam.name = "bubble-shot-trail";
    for (let i = 0; i < 7; i++) {
      const bead = new THREE.Mesh(this.bubbleGeometry, this.bubbleMaterial);
      bead.scale.setScalar(0.13 + i * 0.015);
      this.beam.add(bead);
    }
    this.beam.visible = false;
    this.beamTime = 0;
    this.bubbles = new Map();
    game.scene.add(this.beam);
    this.hud = globalThis.document?.querySelector("#alien-hud");
    this.status = globalThis.document?.querySelector("#alien-status");
    this.toggleButton = globalThis.document?.querySelector("#alien-toggle");
    this.fireButton = globalThis.document?.querySelector("#alien-fire");
    this.pressure = globalThis.document?.querySelector("#alien-pressure");
    globalThis.document
      ?.querySelector("#alien-exit")
      ?.addEventListener("click", () => {
        if (this.canPlay()) this.returnToEntrance(true);
        game.canvas?.focus();
      });
    this.toggleButton?.addEventListener("click", () => {
      this.enabled = !this.enabled;
      game.input?.clear();
      this.shotRequested = false;
      this.crowdTime = 0;
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
      b = this.arena.bounds;
    for (let attempt = 0; attempt < 80; attempt++) {
      const edge = (index + this.spawnSerial + attempt) % 4;
      const t =
        0.12 +
        ((index * 0.197 + this.spawnSerial * 0.137 + attempt * 0.091) % 0.76);
      let x =
        edge === 0
          ? b.minX + 2
          : edge === 1
            ? b.maxX - 2
            : THREE.MathUtils.lerp(b.minX + 2, b.maxX - 2, t);
      let z =
        edge === 2
          ? b.minZ + 2
          : edge === 3
            ? b.maxZ - 2
            : THREE.MathUtils.lerp(b.minZ + 2, b.maxZ - 2, t);
      // A few aliens begin near the first cover islands so the activity is
      // visible from the entrance. Later respawns use the contained perimeter.
      if (attempt === 0 && this.spawnSerial < ALIEN_COUNT) {
        [x, z] = [[278, -226], [220, -262], [315, -300], [225, -330], [185, -380]][index];
      }
      if (
        Math.hypot(x - BUBBLE_ARENA_START.x, z - BUBBLE_ARENA_START.z) < 28 ||
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
    throw new Error("No clear alien spawn inside Bubble Basin");
  }
  reset() {
    this.spawnSerial = 0;
    this.cooldown = 0;
    this.recoil = 0;
    this.beamTime = 0;
    this.shotRequested = false;
    this.beam.visible = false;
    for (const bubble of this.bubbles.values()) this.game.scene.remove(bubble);
    this.bubbles.clear();
    this.gun.visible = false;
    this.crowdTime = 0;
    this.grace = 4;
    this.wasInside = false;
    this.aliens.forEach((a, i) => {
      if (a.model) this.spawn(a, i);
      if (a.model) a.model.visible = false;
    });
  }
  canPlay() {
    const g = this.game;
    return (
      g.area.id === "space" &&
      insideBubbleArena(g.player.position, 1.1) &&
      Math.abs(g.player.position.y - g.area.groundY) < 8 &&
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
    if (this.hud) this.hud.hidden = !active;
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
    if (active && !this.wasInside) {
      this.grace = 4;
      g.ui.toast(
        "Welcome to Bubble Basin! B blows bubbles. Move away if aliens get close. The entrance circle is safe.",
      );
    }
    this.wasInside = active;
    if (!active) this.crowdTime = 0;
    this.grace = Math.max(0, this.grace - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.recoil = Math.max(0, this.recoil - dt);
    this.beamTime = Math.max(0, this.beamTime - dt);
    this.beam.visible = active && this.enabled && this.beamTime > 0;
    this.aliens.forEach((a, i) => {
      if (!a.model) return;
      const bounds = this.arena.bounds;
      a.model.position.x = THREE.MathUtils.clamp(
        a.model.position.x,
        bounds.minX + 1.6,
        bounds.maxX - 1.6,
      );
      a.model.position.z = THREE.MathUtils.clamp(
        a.model.position.z,
        bounds.minZ + 1.6,
        bounds.maxZ - 1.6,
      );
      if (a.respawn > 0) {
        const bubble = this.bubbles.get(a);
        if (bubble && this.enabled) {
          bubble.position.addScaledVector(a.bubbleVelocity, dt);
          bubble.position.x = THREE.MathUtils.clamp(
            bubble.position.x,
            bounds.minX + 1.6,
            bounds.maxX - 1.6,
          );
          bubble.position.z = THREE.MathUtils.clamp(
            bubble.position.z,
            bounds.minZ + 1.6,
            bounds.maxZ - 1.6,
          );
          bubble.rotation.y += dt * 1.4;
          bubble.rotation.x += dt * 0.6;
          a.model.position.copy(bubble.position);
          a.model.visible =
            a.model.position.distanceToSquared(g.player.position) <=
            ALIEN_RENDER_DISTANCE ** 2;
          if (bubble.position.y > g.area.groundY + 32) {
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
      if (
        a.state === "tagged" &&
        a.model.position.distanceTo(g.player.position) > CROWD_DISTANCE
      ) {
        a.state = "waiting";
        a.delay = 0.25;
      }
      a.update(dt);
    });
    this.updateCrowding(dt, active);
    this.refresh();
  }
  updateCrowding(dt, active) {
    const p = this.game.player.position;
    const crowded =
      active &&
      this.enabled &&
      this.grace === 0 &&
      !arenaSafeZone(p) &&
      this.aliens.some((a) => {
        if (
          !a.model ||
          a.respawn > 0 ||
          Math.abs(a.model.position.y - p.y) > 1.4
        )
          return false;
        const origin = a.model.position.clone().add(new THREE.Vector3(0, 1, 0));
        const delta = p
          .clone()
          .add(new THREE.Vector3(0, 1, 0))
          .sub(origin);
        const distance = delta.length();
        if (distance > CROWD_DISTANCE) return false;
        return !this.arena.colliders.some(
          (c) =>
            rayBoxDistance(origin, delta.clone().normalize(), c) < distance,
        );
      });
    this.crowdTime = crowded ? this.crowdTime + dt : 0;
    if (this.crowdTime >= CROWD_SECONDS) this.returnToEntrance(false);
  }
  returnToEntrance(leaving = false) {
    const g = this.game,
      point = leaving ? BUBBLE_ARENA_EXIT : BUBBLE_ARENA_START;
    this.reset();
    if (g.player.teleport)
      g.player.teleport(point.x, point.z, g.areas.space.groundY);
    else g.player.position.set(point.x, g.areas.space.groundY, point.z);
    g.player.heading = Math.PI;
    g.follow?.reset(0);
    g.input?.clear?.();
    this.wasInside = !leaving;
    if (!leaving) this.resetCount++;
    g.ui.toast(
      leaving
        ? "Back outside Bubble Basin. Come back whenever you like."
        : "Back to the safe circle! Take your time, then try again.",
    );
    if (this.hud) this.hud.hidden = leaving;
  }
  refresh() {
    const text = !this.enabled
      ? "Alien chase paused. Explore at your own pace."
      : this.crowdTime > 0
        ? `Move away! Reset in ${Math.max(1, Math.ceil(CROWD_SECONDS - this.crowdTime))}s`
        : `Bubble Basin · ${this.defeated} bubbled · ${arenaSafeZone(this.game.player.position) || this.grace > 0 ? "Safe to get ready" : "Keep space from aliens"}`;
    if (this.status && this.status.textContent !== text)
      this.status.textContent = text;
    if (this.toggleButton)
      this.toggleButton.textContent = this.enabled
        ? "Pause alien chase"
        : "Resume alien chase";
    if (this.fireButton) this.fireButton.disabled = !this.enabled;
    if (this.pressure)
      this.pressure.value = Math.min(
        100,
        (this.crowdTime / CROWD_SECONDS) * 100,
      );
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
    if (!this.canPlay() || !this.enabled) return null;
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
    this.beam.children.forEach((bead, i) => {
      bead.position.copy(origin).addScaledVector(aim, (distance * (i + 1)) / 7);
    });
    this.beam.visible = true;
    this.beamTime = 0.14;
    if (chosen) {
      const bubble = new THREE.Mesh(this.bubbleGeometry, this.bubbleMaterial);
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
