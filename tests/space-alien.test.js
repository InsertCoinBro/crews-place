import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { preparePlayerCharacter } from "../shared/world/player-character.js";
import { Player } from "../shared/core/player.js";
import {
  SpaceAlien,
  alienPath,
  inAlienSafeZone,
} from "../shared/world/space-alien.js";
import { overlapsCircle } from "../shared/core/physics.js";
async function alien() {
  const b = await readFile(
    new URL("../assets/models/moon_mischief.glb", import.meta.url),
  );
  return preparePlayerCharacter(
    await new GLTFLoader().parseAsync(
      b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
      "",
    ),
    "moon_mischief",
  );
}
const area = () => ({
  id: "space",
  groundY: 180,
  bounds: { minX: -42, maxX: 42, minZ: -42, maxZ: 42 },
  colliders: [],
});
function game(template) {
  const a = area(),
    g = {
      scene: new THREE.Scene(),
      areas: { space: a },
      area: a,
      mode: "playing",
      player: { position: new THREE.Vector3(0, 180, 12) },
      ui: { toast() {} },
      playground: { active: false },
      calm: false,
    };
  g.alien = new SpaceAlien(g, template);
  return g;
}
test("alien export has 14 finite animated clips, grounded proportions, and reaching hands", async () => {
  const m = await alien();
  assert.equal(m.animations.length, 14);
  const box = new THREE.Box3().setFromObject(m);
  assert.ok(box.min.y > -0.03 && box.min.y < 0.03);
  assert.ok(box.max.y > 2 && box.max.y < 2.4);
  for (const c of m.animations) {
    assert.ok(c.duration > 0);
    assert.ok(
      c.tracks.every((t) => Array.from(t.values).every(Number.isFinite)),
    );
  }
  m.animator.play("ChaseRun", 0);
  m.animator.mixer.update(0.12);
  m.updateMatrixWorld(true);
  for (const side of ["L", "R"]) {
    const hand = m
      .getObjectByName("Hand" + side)
      .getWorldPosition(new THREE.Vector3());
    const shoulder = m
      .getObjectByName("UpperArm" + side)
      .getWorldPosition(new THREE.Vector3());
    assert.ok(hand.z - shoulder.z > 0.45, "both hands reach forward");
  }
});
test("alien can be selected as player, walk, run, jump and gesture", async () => {
  const m = await alien(),
    p = new Player(new THREE.Scene(), m),
    a = area();
  p.teleport(0, 0, 180);
  const down = new Set(["KeyW"]),
    pressed = new Set();
  const input = {
    down: (...keys) => keys.some((k) => down.has(k)),
    consume: (k) => {
      const v = pressed.has(k);
      pressed.delete(k);
      return v;
    },
  };
  for (let i = 0; i < 30; i++) p.update(1 / 60, input, 0, a);
  assert.equal(m.animator.current, "Walk");
  down.add("ShiftLeft");
  p.update(1 / 60, input, 0, a);
  assert.equal(m.animator.current, "Run");
  pressed.add("Space");
  p.update(1 / 60, input, 0, a);
  assert.equal(m.animator.current, "Jump");
  down.clear();
  for (let i = 0; i < 150; i++) p.update(1 / 60, input, 0, a);
  assert.equal(p.position.y, 180);
  assert.ok(p.gesture("Wave"));
});
test("chase protects landing, pauses, tags once, restarts, stops and hides on leaving", async () => {
  const template = await alien(),
    g = game(template),
    c = g.alien;
  for (let i = 0; i < 360; i++) c.update(1 / 60);
  assert.equal(c.model.position.x, -9);
  assert.ok(inAlienSafeZone(g.player.position));
  g.player.position.set(-15, 180, 12);
  for (let i = 0; i < 260; i++) c.update(1 / 60);
  assert.equal(c.state, "chasing");
  assert.equal(c.model.animator.current, "ChaseRun");
  const before = c.model.position.clone(),
    time = c.model.animator.mixer.time;
  g.mode = "paused";
  for (let i = 0; i < 60; i++) c.update(1 / 60);
  assert.ok(c.model.position.equals(before));
  assert.equal(c.model.animator.mixer.time, time);
  g.mode = "playing";
  let tags = 0;
  g.ui.toast = () => tags++;
  for (let i = 0; i < 300; i++) c.update(1 / 60);
  assert.equal(c.state, "tagged");
  assert.equal(tags, 1);
  c.toggle();
  assert.equal(c.state, "waiting");
  assert.equal(c.model.position.x, -9);
  c.toggle();
  assert.equal(c.enabled, false);
  for (let i = 0; i < 300; i++) c.update(1 / 60);
  assert.equal(c.model.position.x, -9);
  g.area = { id: "town" };
  c.update(1 / 60);
  assert.equal(c.model.visible, false);
  assert.notEqual(
    c.model.getObjectByName("Head"),
    template.getObjectByName("Head"),
  );
});
test("navigation detours around obstacles without entering the rocket safe zone", () => {
  const a = area();
  a.colliders = [
    { minX: -14, maxX: -12, minZ: 7, maxZ: 17, minY: 180, maxY: 185 },
  ];
  const path = alienPath({ x: -9, z: 12 }, { x: -18, z: 12 }, a);
  assert.ok(path.length > 10);
  assert.ok(
    path.every(
      (p) =>
        !inAlienSafeZone(p) && !overlapsCircle(p.x, p.z, 0.48, a.colliders[0]),
    ),
  );
  assert.ok(Math.abs(path.at(-1).x + 18) < 1.5);
});
test("playground participation suspends chasing and gentle mode slows movement", async () => {
  const g = game(await alien()),
    c = g.alien;
  g.player.position.set(-25, 180, 12);
  c.delay = 0;
  g.playground.active = true;
  c.update(0.05);
  assert.equal(c.model.position.x, -9);
  g.playground.active = false;
  c.update(0.05);
  const fast = c.model.position.distanceTo(new THREE.Vector3(-9, 180, 12));
  c.reset();
  c.delay = 0;
  g.calm = true;
  c.update(0.05);
  assert.ok(c.model.position.distanceTo(new THREE.Vector3(-9, 180, 12)) < fast);
});
test("alien spawn and routes work against the actual moon and playground colliders", async () => {
  const { buildSpace } = await import("../shared/world/space.js");
  const { SpacePlayground } = await import(
    "../shared/world/space-playground.js"
  );
  const previous = globalThis.document;
  const element = () => ({
    getContext: () => ({ fillRect() {}, fillText() {} }),
    setAttribute() {},
    querySelector: () => ({}),
    append() {},
  });
  globalThis.document = { createElement: element, querySelector: element };
  try {
    const scene = new THREE.Scene(),
      a = buildSpace(scene);
    const g = {
      scene,
      areas: { space: a },
      interactions: { register() {}, on() {} },
      ui: {},
      player: {},
    };
    // Playground scene construction is exercised in its own integration checks;
    // its colliders are added by the same constructor used in the game.
    new SpacePlayground(g);
    const spawn = { x: -9, z: 12 };
    assert.ok(
      !a.colliders.some((c) => overlapsCircle(spawn.x, spawn.z, 0.48, c)),
      "spawn clear of geometry",
    );
    for (const target of [
      { x: -20, z: 12 },
      { x: 18, z: 0 },
      { x: -20, z: -20 },
    ]) {
      const path = alienPath(spawn, target, a);
      assert.ok(path.length > 0);
      assert.ok(
        Math.hypot(path.at(-1).x - target.x, path.at(-1).z - target.z) < 3,
      );
    }
  } finally {
    globalThis.document = previous;
  }
});
