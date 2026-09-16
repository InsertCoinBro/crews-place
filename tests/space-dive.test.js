import test from "node:test";
import assert from "node:assert/strict";
import {
  createSpaceDiveTrack,
  SpaceDiveRide,
  SPACE_DIVE_STATION,
  SPACE_DIVE_EXIT,
} from "../shared/world/space-dive-track.js";
import { createCoasterTrack } from "../shared/world/coaster-track.js";
import { SPACE_ALTITUDE, SPACE_BOUNDS } from "../shared/world/space.js";
const track = createSpaceDiveTrack();

test("Space Dive is north of Rainbow Rush and clears the existing track and moon surface", () => {
  const rainbow = createCoasterTrack();
  assert.ok(
    SPACE_DIVE_STATION.z < Math.min(...rainbow.points.map((p) => p.z)) - 20,
  );
  assert.ok(Math.max(...track.points.map((p) => p.y)) > SPACE_ALTITUDE + 35);
  assert.ok(Math.min(...track.points.map((p) => p.y)) > 0.6);
  assert.ok(track.points[0].distanceTo(track.points.at(-1)) < 0.001);
  assert.ok(track.rotations[0].angleTo(track.rotations.at(-1)) < 0.01);
  for (let i = 0; i < track.count; i += 4) {
    const p = track.points[i];
    if (p.y < 4)
      assert.ok(
        Math.hypot(p.x - SPACE_DIVE_EXIT.x, p.z - SPACE_DIVE_EXIT.z) > 2,
        "boarding point lies on the track",
      );
    if (
      Math.abs(p.x) < SPACE_BOUNDS.maxX + 4 &&
      Math.abs(p.z) < SPACE_BOUNDS.maxZ + 4
    )
      assert.ok(p.y > SPACE_ALTITUDE + 10, "track intersects lunar ground");
    for (let j = 0; j < rainbow.count; j += 12)
      assert.ok(
        p.distanceTo(rainbow.points[j]) > 4,
        "track crosses Rainbow Rush",
      );
    assert.ok(
      track.rotations[i].angleTo(track.rotations[i + 1]) < 0.1,
      "discontinuous ride frame",
    );
  }
});

for (const fps of [30, 60, 120])
  test(`Space Dive reaches space, cruises for a view, dives fast, and stops at home at ${fps} fps`, () => {
    const ride = new SpaceDiveRide(track);
    assert.equal(ride.launch(), false);
    assert.equal(ride.board(), true);
    ride.update(1);
    assert.equal(ride.distance, 0);
    assert.equal(ride.launch(), true);
    let peak = 0,
      altitude = 0,
      scenicTime = 0,
      divePeak = 0;
    for (let i = 0; i < fps * 150 && ride.state === "riding"; i++) {
      ride.update(1 / fps);
      peak = Math.max(peak, ride.speed);
      altitude = Math.max(altitude, track.sample(ride.distance).position.y);
      if (ride.phase.includes("Space flyby")) scenicTime += 1 / fps;
      if (ride.phase === "SPACE DIVE!")
        divePeak = Math.max(divePeak, ride.speed);
    }
    assert.equal(ride.state, "arrived");
    assert.equal(ride.distance, 0);
    assert.equal(ride.speed, 0);
    assert.ok(altitude > 215);
    assert.ok(scenicTime > 6 && scenicTime < 20);
    assert.ok(divePeak > 50);
    assert.ok(ride.elapsed < 100);
    if (fps === 60)
      console.log(
        `Space Dive: ${track.length.toFixed(0)} m, ${ride.elapsed.toFixed(1)} s, ${(peak * 3.6).toFixed(0)} km/h, ${scenicTime.toFixed(1)} s space view`,
      );
    ride.reset();
    assert.equal(ride.board(), true);
    assert.equal(ride.launch(), true);
  });
