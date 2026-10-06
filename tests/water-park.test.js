import test from "node:test";
import assert from "node:assert/strict";
import {
  createWaterSlide,
  WaterSlideRide,
  WATER_SLIDES,
  WATER_PARK_BOUNDS,
  WATER_POOL,
  WATER_BOWL,
  bowlHeight,
} from "../shared/world/water-park-track.js";
const tracks = WATER_SLIDES.map((_, i) => createWaterSlide(i));

for (const [index, track] of tracks.entries()) {
  test(`${WATER_SLIDES[index].name}: bounded route, continuous frames and separated tube geometry`, () => {
    assert.equal(track.points[0].y, WATER_SLIDES[index].height);
    for (let i = 0; i <= track.count; i++) {
      const p = track.points[i];
      assert(p.toArray().every(Number.isFinite));
      assert(
        p.x > WATER_PARK_BOUNDS.minX + 2.4 &&
          p.x < WATER_PARK_BOUNDS.maxX - 2.4,
        `x bounds ${p.x}`,
      );
      assert(
        p.z > WATER_PARK_BOUNDS.minZ + 2.4 &&
          p.z < WATER_PARK_BOUNDS.maxZ - 2.4,
        `z bounds ${p.z}`,
      );
      assert(p.y >= 9.8);
      if (i)
        assert(
          track.rotations[i].angleTo(track.rotations[i - 1]) < 0.2,
          `abrupt frame at ${i}`,
        );
    }
    assert(track.sample(-10).position.equals(track.points[0]));
    assert(
      track.sample(track.length + 10).position.distanceTo(track.points.at(-1)) <
        1e-8,
    );
    // Every tube has radius 2.4 m. Check nonadjacent sections, retaining the
    // actual 4.8 m clearance requirement rather than weakening it to pass.
    for (let i = 0; i < track.count; i += 5)
      for (let j = i + 5; j < track.count; j += 5) {
        const a = (i / track.count) * track.length,
          b = (j / track.count) * track.length;
        if (b - a < 16 || track.inBowl(a) || track.inBowl(b)) continue;
        assert(
          track.points[i].distanceTo(track.points[j]) > 5.2,
          `tube self-intersection ${i}/${j}`,
        );
      }
  });
  test(`${WATER_SLIDES[index].name}: lift, explicit launch, airborne drop, swimming and manual exit at 30/60/120 fps`, () => {
    const times = [];
    for (const fps of [30, 60, 120]) {
      const ride = new WaterSlideRide(track);
      assert(ride.board());
      assert(!ride.launch(), "launched during lift");
      for (let i = 0; i < fps * 6; i++) ride.update(1 / fps);
      assert.equal(ride.state, "seated");
      assert.equal(ride.distance, 0);
      ride.launch();
      let budget = fps * 160,
        sawDrop = false,
        maxAir = 0;
      while (ride.state !== "swimming" && budget--) {
        ride.update(1 / fps);
        if (ride.state === "dropping") {
          sawDrop = true;
          maxAir = Math.max(maxAir, ride.dropPosition.y - WATER_POOL.surface);
        }
      }
      assert(budget > 0);
      assert(sawDrop && maxAir > 5, "no airborne splashdown");
      assert.equal(ride.distance, track.length);
      times.push(ride.elapsed);
      const before = ride.swimmer.clone();
      for (let i = 0; i < fps * 4; i++) {
        ride.update(1 / fps);
        ride.swim(1 / fps, 0, 0);
      }
      assert(ride.swimmer.equals(before), "automatic pool exit");
      let exited = false;
      for (let i = 0; i < fps * 60 && !exited; i++) {
        const dx = WATER_POOL.exitX - ride.swimmer.x,
          dz = WATER_POOL.exitZ - ride.swimmer.z,
          length = Math.hypot(dx, dz);
        exited = ride.swim(1 / fps, dx / length, dz / length);
      }
      assert(exited, "cannot swim to steps");
      ride.reset();
      assert.equal(ride.state, "waiting");
      assert.equal(ride.distance, 0);
    }
    assert(
      Math.max(...times) - Math.min(...times) < 0.04,
      "frame-rate dependent duration",
    );
  });
}
test("Cosmic Plunge has a true 200+ m vertical section; Twister makes four complete coils", () => {
  const vertical = tracks[0].points.filter(
    (p, i) => p.y > 50 && p.y < 275 && tracks[0].tangents[i].y < -0.9999,
  );
  assert(
    Math.max(...vertical.map((p) => p.y)) -
      Math.min(...vertical.map((p) => p.y)) >
      210,
  );
  assert(
    Math.max(...vertical.map((p) => p.x)) -
      Math.min(...vertical.map((p) => p.x)) <
      0.1,
  );
  let turns = 0,
    previous;
  for (const p of tracks[1].points)
    if (p.y < 121 && p.y > 37) {
      const a = Math.atan2(p.x + 188, -(p.z + 248));
      if (previous !== undefined)
        turns += Math.atan2(Math.sin(a - previous), Math.cos(a - previous));
      previous = a;
    }
  assert(turns > Math.PI * 7.8);
});
test("Loop Lagoon has two inversions and a three-turn descending open bowl connected to its drain", () => {
  const t = tracks[2];
  let inversions = 0,
    upsideDown = false;
  for (let i = 0; i <= t.count; i++) {
    const yes = t.ups[i].y < -0.5;
    if (yes && !upsideDown) inversions++;
    upsideDown = yes;
  }
  assert.equal(inversions, 2);
  let previousRadius = Infinity,
    turns = 0,
    previousAngle;
  for (let d = t.bowlStart; d < t.bowlEnd; d += 0.5) {
    const p = t.sample(d).position,
      r = Math.hypot(p.x - WATER_BOWL.x, p.z - WATER_BOWL.z);
    assert(r < previousRadius + 0.08);
    previousRadius = r;
    assert(
      Math.abs(p.y - bowlHeight(r) - 1.35) < 0.16,
      "raft not on bowl surface",
    );
    const a = Math.atan2(p.x - WATER_BOWL.x, -(p.z - WATER_BOWL.z));
    if (previousAngle !== undefined)
      turns += Math.atan2(
        Math.sin(a - previousAngle),
        Math.cos(a - previousAngle),
      );
    previousAngle = a;
  }
  assert(turns > Math.PI * 5.8);
  assert(previousRadius < WATER_BOWL.hole);
  assert(t.sample(t.bowlEnd + 20).position.y < 15, "drain not below bowl");
});
test("All three entrances, tubes and splashdown points are separate", () => {
  for (let a = 0; a < 3; a++)
    for (let b = a + 1; b < 3; b++) {
      assert(
        Math.hypot(
          WATER_SLIDES[a].entry.x - WATER_SLIDES[b].entry.x,
          WATER_SLIDES[a].entry.z - WATER_SLIDES[b].entry.z,
        ) > 12,
      );
      const t = tracks[a],
        u = tracks[b];
      for (let i = 0; i < t.count; i += 6)
        for (let j = 0; j < u.count; j += 6)
          assert(
            t.points[i].distanceTo(u.points[j]) > 5.2,
            `slides ${a}/${b} intersect`,
          );
    }
});
test("Pool clamps swimmers, normalizes diagonal speed, and gentle mode slows the ride", () => {
  const fast = new WaterSlideRide(tracks[1]),
    gentle = new WaterSlideRide(tracks[1]);
  gentle.gentle = true;
  for (const r of [fast, gentle]) {
    r.board();
    for (let i = 0; i < 660; i++) r.update(1 / 60);
    r.launch();
    for (let i = 0; i < 600; i++) r.update(1 / 60);
  }
  assert(gentle.distance < fast.distance * 0.8);
  while (fast.state !== "swimming") fast.update(0.1);
  const initial = fast.swimmer.clone();
  fast.swim(0.1, 1, 1);
  assert(Math.abs(fast.swimmer.distanceTo(initial) - 0.55) < 1e-8);
  for (let i = 0; i < 2000; i++) fast.swim(0.1, -1, -1);
  assert.equal(fast.swimmer.x, WATER_POOL.minX + 1);
  assert.equal(fast.swimmer.z, WATER_POOL.minZ + 1);
  assert.equal(fast.state, "swimming");
});
