import test from "node:test";
import assert from "node:assert/strict";
import {
  createStarPositions,
  SPACE_ALTITUDE,
  SPACE_BOUNDS,
  SPACE_LANDING_SITE,
  SPACE_WORLD_SIZE,
} from "../shared/world/space.js";
import { stepVertical } from "../shared/core/physics.js";

test("space is a full-size world layer above the countryside", () => {
  assert.ok(SPACE_ALTITUDE > 100);
  assert.equal(SPACE_BOUNDS.maxX - SPACE_BOUNDS.minX, SPACE_WORLD_SIZE);
  assert.equal(SPACE_BOUNDS.maxZ - SPACE_BOUNDS.minZ, SPACE_WORLD_SIZE);
  assert.ok(SPACE_WORLD_SIZE >= 80);
});

test("the future rocket landing site is safely inside the space bounds", () => {
  assert.ok(SPACE_LANDING_SITE.x > SPACE_BOUNDS.minX + 6);
  assert.ok(SPACE_LANDING_SITE.x < SPACE_BOUNDS.maxX - 6);
  assert.ok(SPACE_LANDING_SITE.z > SPACE_BOUNDS.minZ + 6);
  assert.ok(SPACE_LANDING_SITE.z < SPACE_BOUNDS.maxZ - 6);
});

test("the star field is deterministic and surrounds the walkable area", () => {
  const first = createStarPositions(12, 42);
  const second = createStarPositions(12, 42);
  assert.deepEqual(first, second);
  assert.equal(first.length, 36);
  for (let index = 0; index < first.length; index += 3) {
    assert.ok(Math.hypot(first[index], first[index + 2]) >= 72);
    assert.ok(first[index + 1] >= 2);
  }
});

test("walking and jumping settle on the elevated space surface", () => {
  const body = {
    position: { x: 0, y: SPACE_ALTITUDE + 3, z: 0 },
    velocityY: 0,
    grounded: false,
  };
  for (let frame = 0; frame < 180; frame++)
    stepVertical(body, 1 / 60, null, SPACE_ALTITUDE);
  assert.equal(body.position.y, SPACE_ALTITUDE);
  assert.equal(body.velocityY, 0);
  assert.equal(body.grounded, true);
});
