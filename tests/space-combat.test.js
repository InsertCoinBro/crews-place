import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { preparePlayerCharacter } from "../shared/world/player-character.js";
import {
  insideBubbleArena,
  BUBBLE_ARENA_START,
  BUBBLE_ARENA_EXIT,
  CROWD_SECONDS,
} from "../shared/world/bubble-arena.js";
import {
  SpaceCombat,
  aimBlasterArm,
  rayBoxDistance,
} from "../shared/world/space-combat.js";

async function model(id) {
  const b = await readFile(
    new URL(`../assets/models/${id}.glb`, import.meta.url),
  );
  return preparePlayerCharacter(
    await new GLTFLoader().parseAsync(
      b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
      "",
    ),
    id,
  );
}
async function setup() {
  const area = {
    id: "space",
    groundY: 180,
    bounds: { minX: -805, maxX: 805, minZ: -805, maxZ: 805 },
    colliders: [],
  };
  const g = {
    scene: new THREE.Scene(),
    area,
    areas: { space: area },
    mode: "playing",
    player: {
      position: new THREE.Vector3(250, 180, -225),
      heading: 0,
      model: await model("cowboy"),
    },
    ui: { toast() {} },
    input: { consume: () => false },
    calm: false,
  };
  g.scene.add(g.player.model);
  g.player.model.position.copy(g.player.position);
  return new SpaceCombat(g, await model("moon_mischief"));
}
test("five independent aliens spawn in the arena, chase, and freeze on pause", async () => {
  const c = await setup();
  assert.equal(c.aliens.length, 5);
  assert.ok(c.aliens.every((a) => insideBubbleArena(a.model.position, 2)));
  assert.equal(
    new Set(c.aliens.map((a) => a.model.getObjectByName("Head"))).size,
    5,
  );
  const before = c.aliens.map((a) => a.model.position.clone());
  for (let i = 0; i < 180; i++) c.update(1 / 60);
  assert.ok(
    c.aliens.every((a, i) => a.model.position.distanceTo(before[i]) > 1),
  );
  c.game.mode = "paused";
  const frozen = c.aliens.map((a) => a.model.position.clone());
  for (let i = 0; i < 60; i++) c.update(1 / 60);
  assert.ok(c.aliens.every((a, i) => a.model.position.equals(frozen[i])));
});
test("bubbled aliens float upward and respawn within the square", async () => {
  const c = await setup(),
    a = c.aliens[0];
  a.model.position.set(250, 180, -216);
  const origin = new THREE.Vector3(250, 181.1, -224),
    direction = new THREE.Vector3(0, 0, 1);
  assert.equal(c.fire(origin, direction), a);
  assert.equal(c.defeated, 1);
  assert.equal(a.respawn, 1);
  assert.ok(c.bubbles.has(a));
  c.fire(origin, direction);
  assert.equal(c.defeated, 1);
  for (let i = 0; i < 1000; i++) {
    c.update(1 / 60);
    assert.ok(insideBubbleArena(a.model.position, 1.5));
  }
  assert.equal(a.respawn, 0);
  assert.equal(a.model.scale.x, 1);
  assert.equal(c.bubbles.has(a), false);
  const b = c.game.area.bounds,
    p = a.model.position;
  assert.ok(p.x >= b.minX && p.x <= b.maxX && p.z >= b.minZ && p.z <= b.maxZ);
});
test("cover blocks shots and targets behind the player are not hit", async () => {
  const c = await setup(),
    a = c.aliens[0];
  a.model.position.set(250, 180, -216);
  const cover = {
    minX: 248,
    maxX: 252,
    minZ: -221,
    maxZ: -220,
    minY: 180,
    maxY: 184,
  };
  c.game.area.colliders.push(cover);
  const origin = new THREE.Vector3(250, 181.1, -224),
    direction = new THREE.Vector3(0, 0, 1);
  assert.equal(rayBoxDistance(origin, direction, cover), 3);
  assert.equal(c.fire(origin, direction), null);
  assert.equal(a.respawn, 0);
  c.game.area.colliders.splice(c.game.area.colliders.indexOf(cover), 1);
  a.model.position.z = -234;
  assert.equal(c.fire(origin, direction), null);
});
test("outside the square there is no gun or chase, including after leaving through the gate", async () => {
  const c = await setup();
  c.game.player.position.set(BUBBLE_ARENA_EXIT.x, 180, BUBBLE_ARENA_EXIT.z);
  const before = c.aliens.map((a) => a.model.position.clone());
  for (let i = 0; i < 180; i++) c.update(1 / 60);
  assert.equal(c.canPlay(), false);
  assert.equal(
    c.fire(new THREE.Vector3(250, 181, -225), new THREE.Vector3(0, 0, -1)),
    null,
  );
  assert.ok(c.aliens.every((a, i) => a.model.position.equals(before[i])));
  assert.equal(c.gun.visible, false);
  c.game.player.position.set(250, 180, -225);
  assert.equal(c.canPlay(), true);
  c.returnToEntrance(true);
  assert.equal(c.canPlay(), false);
});
test("sustained visible crowding resets gently; cover, distance and safe circle protect the player", async () => {
  const c = await setup(),
    p = c.game.player.position,
    a = c.aliens[0];
  c.grace = 0;
  a.model.position.copy(p).add(new THREE.Vector3(1.8, 0, 0));
  for (let i = 0; i < 100; i++) c.updateCrowding(1 / 60, true);
  assert.ok(c.crowdTime > 1);
  a.model.position.x += 10;
  c.updateCrowding(1 / 60, true);
  assert.equal(c.crowdTime, 0);
  a.model.position.copy(p).add(new THREE.Vector3(1.8, 0, 0));
  const wall = {
    minX: 250.7,
    maxX: 251,
    minZ: -227,
    maxZ: -223,
    minY: 180,
    maxY: 184,
  };
  c.arena.colliders.push(wall);
  for (let i = 0; i < 200; i++) c.updateCrowding(1 / 60, true);
  assert.equal(c.resetCount, 0);
  c.arena.colliders.splice(c.arena.colliders.indexOf(wall), 1);
  for (let i = 0; i < Math.ceil(CROWD_SECONDS * 60) + 2; i++)
    c.updateCrowding(1 / 60, true);
  assert.equal(c.resetCount, 1);
  assert.equal(p.x, BUBBLE_ARENA_START.x);
  assert.equal(p.z, BUBBLE_ARENA_START.z);
  assert.equal(c.bubbles.size, 0);
  assert.ok(
    c.aliens.every((alien) => insideBubbleArena(alien.model.position, 2)),
  );
  c.grace = 0;
  a.model.position.copy(p);
  for (let i = 0; i < 240; i++) c.updateCrowding(1 / 60, true);
  assert.equal(c.resetCount, 1);
});
test("aliens cannot follow the player outside even through the open doorway", async () => {
  const c = await setup(),
    a = c.aliens[0];
  c.game.player.position.set(265, 180, -192);
  a.model.position.set(265, 180, -195);
  a.delay = 0;
  for (let i = 0; i < 600; i++) {
    c.update(1 / 60);
    assert.ok(insideBubbleArena(a.model.position, 1.5));
  }
  c.game.player.position.z = -175;
  const before = a.model.position.clone();
  for (let i = 0; i < 180; i++) c.update(1 / 60);
  assert.ok(a.model.position.equals(before));
});
test("cowboy, robot and alien arms aim forward and recoil without invalid joints", async () => {
  for (const id of ["cowboy", "jolly_robot", "moon_mischief"]) {
    const m = await model(id),
      forward = new THREE.Vector3(0, 0, 1);
    const rest = aimBlasterArm(m, forward, 0);
    assert.ok(rest, `${id} arm missing`);
    assert.ok(rest.z > 0.3, `${id} is not aiming forward`);
    const recoiled = aimBlasterArm(m, forward, 0.3);
    assert.ok(rest.distanceTo(recoiled) > 0.02, `${id} has no recoil`);
    m.traverse((n) => assert.ok(n.quaternion.toArray().every(Number.isFinite)));
  }
});
