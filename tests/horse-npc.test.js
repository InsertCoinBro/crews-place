import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { HORSE_ROUTE, Wildlife } from "../shared/world/wildlife.js";

async function loadHorse() {
  const file = await readFile(
    new URL("../assets/models/horse_npc.glb", import.meta.url),
  );
  return new GLTFLoader().parseAsync(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
    "",
  );
}

test("the supplied horse asset ships at game scale with its four animations", async () => {
  const gltf = await loadHorse();
  assert.deepEqual(
    new Set(gltf.animations.map((clip) => clip.name)),
    new Set(["Idle", "Walk", "LookAround", "TailSwish"]),
  );
  const bounds = new THREE.Box3().setFromObject(gltf.scene);
  assert.ok(bounds.min.y >= -0.01);
  assert.ok(bounds.max.y > 2 && bounds.max.y < 2.3);
});

test("the horse walks a closed outer-meadow route and rests near the player", async () => {
  const wildlife = new Wildlife(new THREE.Group(), await loadHorse());
  const start = wildlife.horse.model.position.clone();
  wildlife.update(2);
  assert.ok(wildlife.horse.model.position.distanceTo(start) > 1);
  assert.equal(wildlife.horse.state, "Walk");
  const ahead = HORSE_ROUTE.sample(wildlife.horse.distance + 0.8);
  wildlife.update(1, { position: new THREE.Vector3(ahead.x, 0, ahead.z) });
  assert.equal(wildlife.horse.state, "Idle");
});
