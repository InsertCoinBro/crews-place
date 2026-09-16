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

test("the farm maze extends west while preserving the north and east boundaries", () => {
  assert.equal(WORLD_SIZE, ORIGINAL_WORLD_SIZE * 3);
  assert.ok(TOWN_BOUNDS.maxX - TOWN_BOUNDS.minX > WORLD_SIZE);
  assert.equal(TOWN_BOUNDS.minX, -244);
  assert.equal(TOWN_BOUNDS.maxX, 90);
  assert.equal(TOWN_BOUNDS.minZ, -2490);
  assert.equal(TOWN_BOUNDS.maxZ, 104);
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
  const area = { group, colliders: [], cameraMeshes: [] };
  buildLandscape(group, area);
  assert.equal(
    group.getObjectByName("expanded-grassland").geometry.parameters.width,
    SCENERY_SIZE,
  );
  assert.ok(area.colliders.length > EXPANSION_TREES.length);
  const ground = group.getObjectByName("expanded-grassland");
  assert.equal(
    ground.position.z + ground.geometry.parameters.depth / 2,
    SCENERY_SIZE / 2,
  );
  assert.equal(
    ground.position.z - ground.geometry.parameters.depth / 2,
    -2400 - SCENERY_SIZE / 2,
  );
  assert.deepEqual(area.expansion, {
    originalSize: 60,
    worldSize: 180,
    scenerySize: SCENERY_SIZE,
    treeCount: EXPANSION_TREES.length,
    flowerPatchCount: 8,
  });
});
