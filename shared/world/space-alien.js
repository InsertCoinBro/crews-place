import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { preparePlayerCharacter } from "./player-character.js";
import { moveHorizontal, overlapsCircle } from "../core/physics.js";
import { SPACE_LANDING_SITE } from "./space.js";

const RADIUS = 0.48;
export const ALIEN_RENDER_DISTANCE = 190;
export function inAlienSafeZone(p) {
  return Math.hypot(p.x - SPACE_LANDING_SITE.x, p.z - SPACE_LANDING_SITE.z) < 6;
}
// Route around the few solid moon obstacles without searching the entire
// one-mile world. The old full-area breadth-first grid became over a million
// cells after Space expanded and stalled the main thread during every replan.
export function alienPath(from, to, area) {
  const clearance = RADIUS + 0.72;
  const safeZone = area.alienSafeZone ?? inAlienSafeZone;
  const clear = (p) =>
    !safeZone(p) &&
    (!area.bounds ||
      (p.x >= area.bounds.minX + RADIUS &&
        p.x <= area.bounds.maxX - RADIUS &&
        p.z >= area.bounds.minZ + RADIUS &&
        p.z <= area.bounds.maxZ - RADIUS)) &&
    !area.colliders.some(
      (c) =>
        (c.minY ?? 0) < area.groundY + 1.9 &&
        c.maxY > area.groundY &&
        overlapsCircle(p.x, p.z, RADIUS + 0.65, c),
    );
  const hitTime = (a, b, box) => {
    if ((box.minY ?? 0) >= area.groundY + 1.9 || box.maxY <= area.groundY)
      return Infinity;
    const dx = b.x - a.x,
      dz = b.z - a.z;
    let near = 0,
      far = 1;
    for (const [origin, delta, lo, hi] of [
      [a.x, dx, box.minX - clearance, box.maxX + clearance],
      [a.z, dz, box.minZ - clearance, box.maxZ + clearance],
    ]) {
      if (Math.abs(delta) < 1e-8) {
        if (origin < lo || origin > hi) return Infinity;
      } else {
        const first = (lo - origin) / delta,
          second = (hi - origin) / delta;
        near = Math.max(near, Math.min(first, second));
        far = Math.min(far, Math.max(first, second));
        if (near > far) return Infinity;
      }
    }
    return far >= 0 && near <= 1 ? Math.max(0, near) : Infinity;
  };
  const firstBlocker = (a, b) => {
    let blocker = null,
      time = Infinity;
    for (const box of area.colliders) {
      const hit = hitTime(a, b, box);
      if (hit < time) {
        time = hit;
        blocker = box;
      }
    }
    return blocker;
  };
  const path = [],
    cursor = { x: from.x, z: from.z };
  for (let turn = 0; turn < 12; turn++) {
    const blocker = firstBlocker(cursor, to);
    if (!blocker) {
      path.push({ x: to.x, z: to.z });
      break;
    }
    const margin = clearance + 0.12,
      corners = [
        { x: blocker.minX - margin, z: blocker.minZ - margin },
        { x: blocker.minX - margin, z: blocker.maxZ + margin },
        { x: blocker.maxX + margin, z: blocker.minZ - margin },
        { x: blocker.maxX + margin, z: blocker.maxZ + margin },
      ]
        .filter(
          (corner) =>
            Math.hypot(corner.x - cursor.x, corner.z - cursor.z) > 0.1 &&
            clear(corner) &&
            !firstBlocker(cursor, corner),
        )
        .sort(
          (a, b) =>
            Math.hypot(a.x - cursor.x, a.z - cursor.z) +
            Math.hypot(a.x - to.x, a.z - to.z) -
            Math.hypot(b.x - cursor.x, b.z - cursor.z) -
            Math.hypot(b.x - to.x, b.z - to.z),
        );
    if (!corners.length) break;
    cursor.x = corners[0].x;
    cursor.z = corners[0].z;
    path.push({ ...cursor });
  }
  if (!path.length && clear(to)) path.push({ x: to.x, z: to.z });
  return path;
}
export class SpaceAlien {
  constructor(game, template, { hud = true, notifyTag = true } = {}) {
    this.game = game;
    this.notifyTag = notifyTag;
    this.enabled = true;
    this.state = "waiting";
    this.delay = 4;
    this.path = [];
    this.pathTime = 0;
    if (template) {
      this.model = preparePlayerCharacter(
        { scene: clone(template.children[0]), animations: template.animations },
        "moon_mischief",
      );
      this.model.name = "SpaceAlienChaser";
      this.model.visible = false;
      game.scene.add(this.model);
    }
    this.hud = hud ? globalThis.document?.querySelector("#alien-hud") : null;
    this.status = hud
      ? globalThis.document?.querySelector("#alien-status")
      : null;
    this.button = hud
      ? globalThis.document?.querySelector("#alien-toggle")
      : null;
    this.button?.addEventListener("click", () => this.toggle());
    this.reset();
  }
  reset() {
    this.state = "waiting";
    this.delay = 4;
    this.path = [];
    this.pathTime = 0;
    this.model?.position.set(-9, this.game.areas.space.groundY, 12);
    this.model?.animator.reset();
  }
  toggle() {
    if (this.state === "tagged") {
      this.enabled = true;
      this.reset();
    } else {
      this.enabled = !this.enabled;
      if (this.enabled) this.reset();
    }
    this.refresh();
  }
  refresh() {
    const buttonText =
      this.state === "tagged"
        ? "Play tag again"
        : this.enabled
          ? "Stop alien chase"
          : "Start alien chase";
    const statusText = !this.enabled
      ? "Moon Mischief is resting."
      : this.state === "tagged"
        ? "Tag! Moon Mischief says hello."
        : this.state === "chasing"
          ? "Moon Mischief is chasing! Walk or run away."
          : "Alien tag · The rocket landing pad is a safe place.";
    if (this.button && this.button.textContent !== buttonText)
      this.button.textContent = buttonText;
    if (this.status && this.status.textContent !== statusText)
      this.status.textContent = statusText;
  }
  update(dt) {
    const g = this.game,
      inSpace = g.area.id === "space";
    if (this.model && !inSpace) this.model.visible = false;
    if (this.hud)
      this.hud.hidden = !inSpace || g.mode !== "playing" || !this.model;
    if (!this.model || !inSpace || g.mode !== "playing") return;
    dt = Math.min(Math.max(dt, 0), 0.05);
    const a = this.model.animator,
      p = g.player.position;
    const area = this.navigationArea ?? g.area;
    const safeZone = area.alienSafeZone ?? inAlienSafeZone;
    const syncVisibility = () => {
      this.model.visible =
        this.model.position.distanceToSquared(p) <= ALIEN_RENDER_DISTANCE ** 2;
      return this.model.visible;
    };
    const animate = () => {
      if (syncVisibility()) a.mixer.update(dt);
    };
    const safe =
      safeZone(p) || g.playground?.active || Math.abs(p.y - g.area.groundY) > 2;
    if (!this.enabled || safe || this.state === "tagged") {
      if (this.state !== "tagged") this.state = "waiting";
      a.play(this.state === "tagged" ? "Wave" : "Idle");
      animate();
      this.pathTime = 0;
      this.refresh();
      return;
    }
    this.delay = Math.max(0, this.delay - dt);
    if (this.delay > 0) {
      a.play("LookAround");
      animate();
      this.refresh();
      return;
    }
    const dist = Math.hypot(
      p.x - this.model.position.x,
      p.z - this.model.position.z,
    );
    // Avoid tagging through walls, or reaching a player above the alien.
    const blocked = area.colliders.some((c) => {
      for (let i = 0; i <= 5; i++) {
        const t = i / 5;
        if (
          c.maxY > g.area.groundY &&
          overlapsCircle(
            this.model.position.x + (p.x - this.model.position.x) * t,
            this.model.position.z + (p.z - this.model.position.z) * t,
            0.1,
            c,
          )
        )
          return true;
      }
      return false;
    });
    if (dist < 1.65 && !blocked && Math.abs(p.y - g.area.groundY) < 0.8) {
      this.state = "tagged";
      a.play("Wave");
      if (this.notifyTag)
        g.ui.toast(
          "Tag! Moon Mischief says hello. Play again whenever you like.",
        );
      this.refresh();
      return;
    }
    this.state = "chasing";
    this.pathTime -= dt;
    if (this.pathTime <= 0) {
      this.path = alienPath(this.model.position, p, area);
      this.pathTime = 0.8;
    }
    while (
      this.path.length &&
      Math.hypot(
        this.path[0].x - this.model.position.x,
        this.path[0].z - this.model.position.z,
      ) < 0.3
    )
      this.path.shift();
    const target = dist < 3 && !blocked ? p : this.path[0];
    let moved = 0;
    if (target) {
      const dx = target.x - this.model.position.x,
        dz = target.z - this.model.position.z,
        d = Math.hypot(dx, dz),
        speed = g.calm ? 2.3 : 3.6;
      const distance = Math.min(speed * dt, d),
        before = this.model.position.clone();
      if (d > 0.001) {
        moveHorizontal(
          this.model.position,
          (dx / d) * distance,
          (dz / d) * distance,
          area.colliders,
          area.bounds,
          RADIUS,
        );
        if (safeZone(this.model.position)) this.model.position.copy(before);
        this.model.rotation.y = Math.atan2(dx, dz);
        moved = this.model.position.distanceTo(before);
      }
    }
    a.play(moved > 0.0001 ? "ChaseRun" : "Idle");
    animate();
    this.refresh();
  }
}
