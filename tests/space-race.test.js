import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { preparePlayerCharacter } from "../shared/world/player-character.js";
import { Player } from "../shared/core/player.js";
import { SpaceRace } from "../shared/world/space-race.js";
import {
  createSpaceRaceTrack,
  SpaceRaceRun,
  RACE_BOOST_SPEED,
  RACE_LANE_LIMIT,
  RACE_ENTRY,
} from "../shared/world/space-race-track.js";
import { SPACE_BOUNDS, SPACE_ALTITUDE } from "../shared/world/space.js";

const track = createSpaceRaceTrack();
function drive(run, { gentle = false, brake = false } = {}) {
  const r = run.racers[0];
  const obstacle = track.obstacles.find(
    (o) => o.distance > r.distance - 5 && o.distance < r.distance + 85,
  );
  const pad = track.boosts.find(
    (b) => b.distance > r.distance && b.distance < r.distance + 65,
  );
  const target = obstacle ? (obstacle.lane < 0 ? 5 : -5) : (pad?.lane ?? 0);
  return {
    steer: THREE.MathUtils.clamp((target - r.lane) * 2, -1, 1),
    gentle,
    brake,
  };
}
test("Moonbeam Rally occupies the vacant west moon, stays inside bounds, and cannot finish within a minute", () => {
  assert.ok(track.length / RACE_BOOST_SPEED > 60);
  const points = Array.from(
    { length: 1000 },
    (_, i) => track.sample((i / 1000) * track.length).position,
  );
  for (const p of points) {
    assert.ok(p.x < -140);
    assert.ok(p.x > SPACE_BOUNDS.minX + 12);
    assert.ok(p.z > SPACE_BOUNDS.minZ + 12 && p.z < SPACE_BOUNDS.maxZ - 12);
  }
  for (let i = 0; i < points.length; i++)
    for (let j = i + 15; j < points.length; j++) {
      if (Math.min(j - i, 1000 - (j - i)) < 15) continue;
      assert.ok(points[i].distanceTo(points[j]) > 24, "track crosses itself");
    }
});
test("all four jumps leave the ramp, visibly float above the road, and land continuously", () => {
  assert.equal(track.jumps.length, 4);
  for (const j of track.jumps) {
    const start = track.sample(j.start + j.ramp),
      peak = track.sample(j.start + j.ramp + j.flight / 2),
      end = track.sample(j.start + j.ramp + j.flight);
    assert.ok(start.roadY > 3);
    assert.ok(peak.lift > 8);
    assert.equal(end.lift, 0);
    let last = track.sample(j.start - 1);
    for (let d = j.start; d < j.start + j.ramp + j.flight + 1; d += 0.5) {
      const s = track.sample(d);
      assert.ok(Math.abs(s.roadY + s.lift - last.roadY - last.lift) < 0.7);
      last = s;
    }
  }
});
for (const fps of [30, 60, 120])
  test(`real steering can win a full race at ${fps} fps; reset repeats both aliens exactly`, () => {
    const run = new SpaceRaceRun(track),
      trips = [];
    for (let n = 0; n < 2; n++) {
      run.reset();
      run.start();
      let budget = fps * 200;
      while (run.state !== "finished" && budget--) {
        run.update(1 / fps, drive(run));
        assert.ok(Math.abs(run.racers[0].lane) <= RACE_LANE_LIMIT);
      }
      assert.ok(budget > 0);
      assert.equal(run.place, 1);
      assert.ok(run.elapsed > 60 && run.elapsed < 95);
      trips.push(run.racers.map((r) => [r.distance, r.lane, r.finish]));
    }
    assert.deepEqual(trips[0], trips[1]);
  });
test("barriers contain sustained steering; brake produces a non-winning finish; gentle mode slows all racers fairly", () => {
  const normal = new SpaceRaceRun(track),
    calm = new SpaceRaceRun(track),
    slow = new SpaceRaceRun(track);
  for (const r of [normal, calm, slow]) r.start();
  for (let i = 0; i < 10000 && slow.state !== "finished"; i++) {
    normal.update(0.05, drive(normal));
    calm.update(0.05, drive(calm, { gentle: true }));
    slow.update(0.05, { steer: 1, brake: true });
    assert.ok(slow.racers[0].lane <= RACE_LANE_LIMIT);
  }
  assert.equal(slow.place, 3);
  assert.equal(normal.place, 1);
  assert.equal(calm.place, 1);
  assert.ok(calm.elapsed > normal.elapsed * 1.35);
});

async function avatar(id) {
  const data = await readFile(
    new URL(`../assets/models/${id}.glb`, import.meta.url),
  );
  return preparePlayerCharacter(
    await new GLTFLoader().parseAsync(
      data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
      "",
    ),
    id,
  );
}
for (const id of ["cowboy", "jolly_robot", "moon_mischief"])
  test(`${id} races visibly, pauses, earns exactly one first-place trophy, replays, and exits walking`, async () => {
    const model = await avatar(id),
      alien = await avatar("moon_mischief"),
      scene = new THREE.Scene(),
      group = new THREE.Group();
    group.position.y = SPACE_ALTITUDE;
    scene.add(group);
    const area = {
      id: "space",
      group,
      groundY: SPACE_ALTITUDE,
      bounds: SPACE_BOUNDS,
      colliders: [],
    };
    const game = {
      scene,
      area,
      areas: { space: area },
      mode: "playing",
      player: new Player(scene, model),
      camera: new THREE.PerspectiveCamera(55, 1, 0.1, 2200),
      input: { consume: () => false, down: () => false, clear() {} },
      ui: { toast() {}, showPrompt() {} },
      follow: { reset() {} },
      interactions: { register() {}, on() {} },
    };
    const race = new SpaceRace(game, alien);
    assert.equal(race.board(), true);
    assert.equal(model.parent, race.karts[0]);
    assert.notEqual(
      race.aliens[0].getObjectByProperty("isBone", true),
      race.aliens[1].getObjectByProperty("isBone", true),
    );
    race.start();
    for (let i = 0; i < 200; i++) race.update(0.05);
    const d = race.run.racers[0].distance;
    game.mode = "paused";
    race.update(1);
    assert.equal(race.run.racers[0].distance, d);
    game.mode = "playing";
    let budget = 3000;
    while (race.run.state !== "finished" && budget--) {
      const action = drive(race.run);
      game.input.down = (code) =>
        code === "KeyD"
          ? action.steer > 0.05
          : code === "KeyA"
            ? action.steer < -0.05
            : false;
      race.update(0.05);
      race.updateCamera(0.05);
      assert.ok(game.camera.quaternion.toArray().every(Number.isFinite));
      assert.ok(model.visible);
    }
    assert.ok(budget > 0);
    assert.equal(race.run.place, 1);
    assert.equal(race.wins, 1);
    assert.ok(race.trophy.visible);
    for (let i = 0; i < 100; i++) race.update(0.05);
    assert.equal(race.wins, 1);
    race.start();
    assert.equal(race.run.state, "countdown");
    race.exit();
    assert.equal(model.parent, scene);
    assert.equal(game.player.inVehicle, false);
    assert.equal(game.camera.fov, 55);
    assert.deepEqual(game.player.position.toArray(), [
      RACE_ENTRY.x,
      SPACE_ALTITUDE,
      RACE_ENTRY.z,
    ]);
  });
