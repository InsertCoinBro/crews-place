import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { preparePlayerCharacter } from "../shared/world/player-character.js";
import { Player } from "../shared/core/player.js";
import { SpaceTube } from "../shared/world/space-tube.js";
import {
  createSpaceTubeTrack,
  SpaceTubeRide,
  TUBE_RADIUS,
  TUBE_EXIT,
} from "../shared/world/space-tube-track.js";
import { SPACE_ALTITUDE, SPACE_BOUNDS } from "../shared/world/space.js";

const track = createSpaceTubeTrack();
test("Slipstream is a continuous three-kilometer east-side course with a 300m summit and inversions", () => {
  assert.ok(track.length > 3000);
  assert.ok(Math.max(...track.points.map((p) => p.y)) > 300);
  for (let i = 0; i < track.count; i++) {
    const p = track.points[i];
    assert.ok(
      p.x > 130 &&
        p.x < SPACE_BOUNDS.maxX - 10 &&
        Math.abs(p.z) < SPACE_BOUNDS.maxZ - 10,
    );
    assert.ok(p.y > 2.7);
    assert.ok(track.rotations[i].toArray().every(Number.isFinite));
    assert.ok(
      track.rotations[i].angleTo(track.rotations[i + 1]) < 0.21,
      "abrupt ride frame",
    );
  }
  assert.ok(track.ups.filter((v) => v.y < -0.7).length > 100, "no inversions");
  assert.ok(
    track.sample(track.length).position.distanceTo(track.points.at(-1)) < 0.001,
  );
});
test("separate stretches of the tube do not cross through each other", () => {
  // Skip the adjacent 20 m of continuous tube; sample the rest every 2.5 m.
  for (let i = 0; i < track.count; i += 3)
    for (let j = i + 24; j < track.count; j += 3)
      assert.ok(track.points[i].distanceTo(track.points[j]) > TUBE_RADIUS * 2);
});
for (const fps of [30, 60, 120])
  test(`full tube ride lasts 60 seconds and brakes to an exact stop at ${fps} fps`, () => {
    const r = new SpaceTubeRide(track);
    r.launch();
    let elapsed = 0,
      last = 0;
    while (r.state === "riding" && elapsed < 70) {
      r.update(1 / fps);
      elapsed += 1 / fps;
      assert.ok(r.distance >= last);
      last = r.distance;
    }
    assert.ok(elapsed >= 60 && elapsed < 60.1);
    assert.equal(r.distance, track.length);
    assert.equal(r.speed, 0);
    assert.equal(r.state, "arrived");
  });
test("gentler motion keeps the complete route and extends the duration", () => {
  const r = new SpaceTubeRide(track);
  r.launch();
  for (let i = 0; i < 600; i++) r.update(0.1, true);
  assert.equal(r.state, "riding");
  assert.ok(r.elapsed < 45);
  for (let i = 0; i < 300; i++) r.update(0.1, true);
  assert.equal(r.state, "arrived");
});
for (const id of ["cowboy", "jolly_robot", "moon_mischief"])
  test(`${id} rides stomach down, pauses and restores a walkable avatar on exit`, async () => {
    const bytes = await readFile(
      new URL(`../assets/models/${id}.glb`, import.meta.url),
    );
    const model = preparePlayerCharacter(
      await new GLTFLoader().parseAsync(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ),
        "",
      ),
      id,
    );
    const scene = new THREE.Scene(),
      group = new THREE.Group();
    group.position.y = SPACE_ALTITUDE;
    scene.add(group);
    const area = { id: "space", groundY: SPACE_ALTITUDE, group, colliders: [] };
    const game = {
      scene,
      area,
      areas: { space: area },
      mode: "playing",
      player: new Player(scene, model),
      camera: new THREE.PerspectiveCamera(55, 1, 0.1, 2200),
      input: {
        clear() {},
        consume() {
          return false;
        },
      },
      follow: { reset() {} },
      ui: { toast() {}, showPrompt() {} },
      interactions: { register() {}, on() {} },
    };
    const tube = new SpaceTube(game);
    assert.equal(tube.board(), true);
    assert.equal(tube.board(), false);
    assert.equal(model.parent, tube.carrier);
    assert.ok(
      new THREE.Vector3(0, 1, 0).applyQuaternion(model.quaternion).z > 0.99,
    );
    assert.ok(
      new THREE.Vector3(0, 0, 1).applyQuaternion(model.quaternion).y < -0.99,
    );
    for (const side of ["L", "R"]) {
      const arm =
        model.getObjectByName("DEF-upper_arm" + side) ??
        model.getObjectByName("UpperArm" + side);
      const hand =
        model.getObjectByName("DEF-hand" + side) ??
        model.getObjectByName("Hand" + side);
      const reach = hand
        .getWorldPosition(new THREE.Vector3())
        .sub(arm.getWorldPosition(new THREE.Vector3()))
        .normalize();
      const headFirst = new THREE.Vector3(0, 1, 0).transformDirection(
        model.matrixWorld,
      );
      assert.ok(
        reach.dot(headFirst) > 0.9,
        "arms must reach head-first down the tube",
      );
    }
    for (let i = 0; i < 80; i++) {
      tube.update(0.05);
      tube.updateCamera(0.05);
    }
    const d = tube.ride.distance;
    game.mode = "paused";
    tube.update(2);
    assert.equal(tube.ride.distance, d);
    game.mode = "playing";
    tube.toggleView();
    tube.updateCamera(0.05);
    assert.ok(game.camera.position.toArray().every(Number.isFinite));
    assert.ok(model.visible);
    tube.exit();
    assert.equal(model.parent, scene);
    assert.equal(game.player.inVehicle, false);
    assert.deepEqual(game.player.position.toArray(), [
      TUBE_EXIT.x,
      SPACE_ALTITUDE,
      TUBE_EXIT.z,
    ]);
    assert.equal(game.camera.far, 2200);
    assert.equal(tube.board(), true);
    for (let i = 0; i < 1201; i++) tube.update(0.05);
    assert.equal(tube.occupied, false);
    assert.equal(model.parent, scene);
  });
