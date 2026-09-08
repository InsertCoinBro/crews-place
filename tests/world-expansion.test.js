import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  buildLandscape,
  EXPANSION_TREES,
  ORIGINAL_WORLD_SIZE,
  SCENERY_SIZE,
  TOWN_BOUNDS,
  WORLD_SIZE,
} from "../shared/world/landscape.js";

test("the playable countryside is three times the original width and depth", () => {
  assert.equal(WORLD_SIZE, ORIGINAL_WORLD_SIZE * 3);
  assert.equal(TOWN_BOUNDS.maxX - TOWN_BOUNDS.minX, WORLD_SIZE);
  assert.equal(TOWN_BOUNDS.maxZ - TOWN_BOUNDS.minZ, WORLD_SIZE);
  assert.ok(SCENERY_SIZE > WORLD_SIZE, "scenery should hide the playable edge");
});

test("the expansion keeps tree clusters outside the original town and inside the new bounds", () => {
  assert.ok(EXPANSION_TREES.length >= 20);
  for (const [x, z] of EXPANSION_TREES) {
    assert.ok(Math.abs(x) > 30 || Math.abs(z) > 30);
    assert.ok(Math.abs(x) < TOWN_BOUNDS.maxX && Math.abs(z) < TOWN_BOUNDS.maxZ);
  }
});

test("landscape builds full ground, scenery, and matching tree colliders", () => {
  const group = new THREE.Group();
  const area = { colliders: [] };
  buildLandscape(group, area);
  assert.equal(
    group.getObjectByName("expanded-grassland").geometry.parameters.width,
    SCENERY_SIZE,
  );
  assert.equal(area.colliders.length, EXPANSION_TREES.length);
  assert.deepEqual(area.expansion, {
    originalSize: 60,
    worldSize: 180,
    scenerySize: 300,
    treeCount: EXPANSION_TREES.length,
    flowerPatchCount: 8,
  });
});
