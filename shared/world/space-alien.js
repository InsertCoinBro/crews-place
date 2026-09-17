import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { preparePlayerCharacter } from "./player-character.js";
import { moveHorizontal, overlapsCircle } from "../core/physics.js";
import { SPACE_LANDING_SITE } from "./space.js";

const RADIUS = 0.48;
export function inAlienSafeZone(p) {
  return Math.hypot(p.x - SPACE_LANDING_SITE.x, p.z - SPACE_LANDING_SITE.z) < 6;
}
// A small breadth-first navigation grid routes around moon rocks and playground walls.
export function alienPath(from, to, area) {
  const step = 1.5,
    b = area.bounds;
  const nx = Math.floor((b.maxX - b.minX) / step),
    nz = Math.floor((b.maxZ - b.minZ) / step);
  const cell = (p) => [
    Math.max(0, Math.min(nx - 1, Math.floor((p.x - b.minX) / step))),
    Math.max(0, Math.min(nz - 1, Math.floor((p.z - b.minZ) / step))),
  ];
  const point = (x, z) => ({
    x: b.minX + (x + 0.5) * step,
    z: b.minZ + (z + 0.5) * step,
  });
  const clear = (p) =>
    !inAlienSafeZone(p) &&
    !area.colliders.some(
      (c) =>
        (c.minY ?? 0) < area.groundY + 1.9 &&
        c.maxY > area.groundY &&
        overlapsCircle(p.x, p.z, RADIUS + 0.65, c),
    );
  const [sx, sz] = cell(from),
    [tx, tz] = cell(to),
    start = sz * nx + sx,
    target = tz * nx + tx;
  const queue = [start],
    parents = new Map([[start, null]]);
  let end = start,
    best = Infinity;
  for (let i = 0; i < queue.length; i++) {
    const key = queue[i],
      x = key % nx,
      z = Math.floor(key / nx),
      d = (x - tx) ** 2 + (z - tz) ** 2;
    if (d < best) {
      best = d;
      end = key;
    }
    if (key === target) break;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const xx = x + dx,
        zz = z + dz,
        k = zz * nx + xx;
      if (
        xx < 0 ||
        zz < 0 ||
        xx >= nx ||
        zz >= nz ||
        parents.has(k) ||
        !clear(point(xx, zz))
      )
        continue;
      parents.set(k, key);
      queue.push(k);
    }
  }
  const path = [];
  while (end !== start) {
    path.unshift(point(end % nx, Math.floor(end / nx)));
    end = parents.get(end);
  }
  return path;
}
export class SpaceAlien {
  constructor(game, template) {
    this.game = game;
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
    this.hud = globalThis.document?.querySelector("#alien-hud");
    this.status = globalThis.document?.querySelector("#alien-status");
    this.button = globalThis.document?.querySelector("#alien-toggle");
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
      visible = g.area.id === "space";
    if (this.model) this.model.visible = visible;
    if (this.hud)
      this.hud.hidden = !visible || g.mode !== "playing" || !this.model;
    if (!this.model || !visible || g.mode !== "playing") return;
    dt = Math.min(Math.max(dt, 0), 0.05);
    const a = this.model.animator,
      p = g.player.position;
    const safe =
      inAlienSafeZone(p) ||
      g.playground?.active ||
      Math.abs(p.y - g.area.groundY) > 2;
    if (!this.enabled || safe || this.state === "tagged") {
      if (this.state !== "tagged") this.state = "waiting";
      a.play(this.state === "tagged" ? "Wave" : "Idle");
      a.mixer.update(dt);
      this.pathTime = 0;
      this.refresh();
      return;
    }
    this.delay = Math.max(0, this.delay - dt);
    if (this.delay > 0) {
      a.play("LookAround");
      a.mixer.update(dt);
      this.refresh();
      return;
    }
    const dist = Math.hypot(
      p.x - this.model.position.x,
      p.z - this.model.position.z,
    );
    // Avoid tagging through walls, or reaching a player above the alien.
    const blocked = g.area.colliders.some((c) => {
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
      g.ui.toast(
        "Tag! Moon Mischief says hello. Play again whenever you like.",
      );
      this.refresh();
      return;
    }
    this.state = "chasing";
    this.pathTime -= dt;
    if (this.pathTime <= 0) {
      this.path = alienPath(this.model.position, p, g.area);
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
          g.area.colliders,
          g.area.bounds,
          RADIUS,
        );
        if (inAlienSafeZone(this.model.position))
          this.model.position.copy(before);
        this.model.rotation.y = Math.atan2(dx, dz);
        moved = this.model.position.distanceTo(before);
      }
    }
    a.play(moved > 0.0001 ? "ChaseRun" : "Idle");
    a.mixer.update(dt);
    this.refresh();
  }
}
