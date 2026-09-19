import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { preparePlayerCharacter } from "../shared/world/player-character.js";
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
    bounds: { minX: -83, maxX: 42, minZ: -42, maxZ: 64 },
    colliders: [],
  };
  const g = {
    scene: new THREE.Scene(),
    area,
    areas: { space: area },
    mode: "playing",
    player: {
      position: new THREE.Vector3(-20, 180, 0),
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
test("five independent aliens spawn at the boundary, chase, and freeze on pause", async () => {
  const c = await setup();
  assert.equal(c.aliens.length, 5);
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
test("bubble launcher captures an alien and respawns it after it floats beyond the edge", async () => {
  const c = await setup(),
    a = c.aliens[0];
  a.model.position.set(-20, 180, 9);
  const origin = new THREE.Vector3(-20, 181.1, 1),
    direction = new THREE.Vector3(0, 0, 1);
  assert.equal(c.fire(origin, direction), a);
  assert.equal(c.defeated, 1);
  assert.equal(a.respawn, 1);
  assert.ok(c.bubbles.has(a));
  c.fire(origin, direction);
  assert.equal(c.defeated, 1);
  for (let i = 0; i < 1000; i++) c.update(1 / 60);
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
  a.model.position.set(-20, 180, 9);
  c.game.area.colliders = [
    { minX: -22, maxX: -18, minZ: 4, maxZ: 5, minY: 180, maxY: 184 },
  ];
  const origin = new THREE.Vector3(-20, 181.1, 1),
    direction = new THREE.Vector3(0, 0, 1);
  assert.equal(rayBoxDistance(origin, direction, c.game.area.colliders[0]), 3);
  assert.equal(c.fire(origin, direction), null);
  assert.equal(a.respawn, 0);
  c.game.area.colliders = [];
  a.model.position.z = -9;
  assert.equal(c.fire(origin, direction), null);
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
