import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  makeMaze,
  mazeWalls,
  mazePoint,
  driveTractor,
} from "../shared/world/corn-maze.js";
import { WORLD_BOUNDS } from "../shared/world/world-layout.js";
const grid = makeMaze(),
  walls = mazeWalls(grid);
const neighbors = (x, z) =>
  [
    [x + 1, z],
    [x - 1, z],
    [x, z + 1],
    [x, z - 1],
  ].filter(([a, b]) => grid[b]?.[a] === 0);
test("large maze has one solution, connected paths and multiple dead ends", () => {
  const seen = new Set(),
    queue = [[16, 11]];
  let edges = 0,
    dead = 0;
  while (queue.length) {
    const [x, z] = queue.shift(),
      key = `${x},${z}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const ns = neighbors(x, z);
    edges += ns.length;
    if (ns.length === 1) dead++;
    queue.push(...ns.filter(([a, b]) => !seen.has(`${a},${b}`)));
  }
  assert.ok(seen.has("0,1"));
  assert.equal(seen.size, grid.flat().filter((v) => !v).length);
  assert.equal(edges / 2, seen.size - 1);
  assert.ok(dead >= 5);
  assert.ok(grid.length * 8 >= 130);
});
test("tractor can traverse every corridor connection with its full collision radius", () => {
  for (let z = 0; z < 17; z++)
    for (let x = 0; x < 17; x++)
      if (!grid[z][x])
        for (const [a, b] of neighbors(x, z)) {
          const model = new THREE.Group();
          const p = mazePoint(x, z),
            q = mazePoint(a, b);
          model.position.set(p.x, 0, p.z);
          model.rotation.y = Math.atan2(q.x - p.x, q.z - p.z);
          driveTractor(
            model,
            8 / 6,
            { down: (...keys) => keys.includes("KeyW") },
            walls,
            WORLD_BOUNDS,
          );
          assert.ok(
            Math.hypot(model.position.x - q.x, model.position.z - q.z) < 0.001,
            `blocked ${x},${z} to ${a},${b}`,
          );
        }
});
test("tractor stops at walls, reverses and turns in place", () => {
  const model = new THREE.Group();
  const p = mazePoint(15, 11);
  model.position.set(p.x, 0, p.z);
  const obstacle = [
    { minX: p.x - 8, maxX: p.x + 8, minZ: p.z + 4, maxZ: p.z + 12, maxY: 4.4 },
  ];
  driveTractor(
    model,
    2,
    { down: (...k) => k.includes("KeyW") },
    obstacle,
    WORLD_BOUNDS,
  );
  assert.ok(model.position.z <= p.z + 2.2);
  const before = model.position.z;
  driveTractor(
    model,
    0.2,
    { down: (...k) => k.includes("KeyS") },
    obstacle,
    WORLD_BOUNDS,
  );
  assert.ok(model.position.z < before);
  const pos = model.position.clone();
  driveTractor(
    model,
    1,
    { down: (...k) => k.includes("KeyA") },
    obstacle,
    WORLD_BOUNDS,
  );
  assert.ok(model.rotation.y > 1);
  assert.deepEqual(model.position, pos);
});
