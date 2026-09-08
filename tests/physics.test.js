import test from "node:test";
import assert from "node:assert/strict";
import {
  moveHorizontal,
  stepVertical,
  overlapsCircle,
} from "../shared/core/physics.js";
import { Interactions } from "../shared/core/interactions.js";
import { BUILDINGS } from "../shared/world/town.js";
import { TRAFFIC_ROUTES } from "../shared/world/traffic.js";
import { NPC_ROUTES } from "../shared/world/npcs.js";
const bounds = { minX: -29, maxX: 29, minZ: -29, maxZ: 29 };
test("Collision substeps block high-speed tunneling and permit wall sliding", () => {
  const p = { x: 0, y: 0, z: 0 };
  moveHorizontal(
    p,
    20,
    4,
    [{ minX: 2, maxX: 3, minZ: -10, maxZ: 10, maxY: 8 }],
    bounds,
  );
  assert.ok(p.x <= 1.65);
  assert.ok(p.z > 3.9);
});
test("World edges clamp player radius", () => {
  const p = { x: 0, y: 0, z: 0 };
  moveHorizontal(p, 100, -100, [], bounds);
  assert.equal(p.x, 28.64);
  assert.equal(p.z, -28.64);
});
test("Jump height and trampoline landing are stable at 30, 60 and 120 fps", () => {
  for (const fps of [30, 60, 120]) {
    const b = { position: { x: 0, y: 0, z: 0 }, velocityY: 8, grounded: false };
    let peak = 0,
      bounces = 0;
    for (let i = 0; i < fps * 3; i++) {
      const e = stepVertical(b, 1 / fps, {
        x: 0,
        z: 0,
        radius: 2,
        height: 0.48,
      });
      peak = Math.max(peak, b.position.y);
      if (e === "bounce") bounces++;
    }
    assert.ok(peak > 4.5 && peak < 5.2);
    assert.ok(bounces >= 2);
  }
});
test("Ground stops gravity; trampoline cannot launch someone outside its mat", () => {
  const b = { position: { x: 4, y: 5, z: 0 }, velocityY: 0, grounded: false };
  for (let i = 0; i < 120; i++)
    stepVertical(b, 1 / 60, { x: 0, z: 0, radius: 2, height: 0.48 });
  assert.equal(b.position.y, 0);
  assert.equal(b.velocityY, 0);
  assert.ok(b.grounded);
});
test("Interactions choose nearest, honor area and height, and dispatch reusable handlers", () => {
  const system = new Interactions();
  let hit = "";
  system.on("door", (i) => (hit = i.id));
  system.register({ id: "a", kind: "door", area: "town", x: 0, z: 0 });
  system.register({ id: "b", kind: "door", area: "room", x: 0, z: 0 });
  assert.equal(system.find({ x: 0, y: 0, z: 1 }, "town").id, "a");
  system.activate();
  assert.equal(hit, "a");
  assert.equal(system.find({ x: 0, y: 5, z: 0 }, "town"), null);
  assert.equal(system.find({ x: 9, y: 0, z: 9 }, "town"), null);
});
test("Every NPC and traffic route clears building footprints and remains in town", () => {
  for (const route of [...TRAFFIC_ROUTES, ...NPC_ROUTES])
    for (let d = 0; d < route.length; d += 0.2) {
      const p = route.sample(d);
      assert.ok(Math.abs(p.x) < 28 && Math.abs(p.z) < 28);
      for (const b of BUILDINGS)
        assert.equal(
          overlapsCircle(p.x, p.z, 0.8, {
            minX: b.x - b.w / 2,
            maxX: b.x + b.w / 2,
            minZ: b.z - b.d / 2,
            maxZ: b.z + b.d / 2,
          }),
          false,
          `${p.x},${p.z} intersects ${b.id}`,
        );
    }
});
test("Traffic route centers remain on road surfaces", () => {
  for (const route of TRAFFIC_ROUTES)
    for (let d = 0; d < route.length; d += 0.2) {
      const p = route.sample(d);
      assert.ok(
        (Math.abs(p.x) >= 21 && Math.abs(p.x) <= 27 && Math.abs(p.z) <= 27) ||
          (Math.abs(p.z) >= 21 && Math.abs(p.z) <= 27 && Math.abs(p.x) <= 27),
      );
    }
});
