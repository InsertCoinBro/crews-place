import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  AIRFIELD_SITE,
  FlyablePlane,
  PLANE_MAX_ALTITUDE,
  PLANE_WORLD_LIMIT,
} from "../shared/world/airfield.js";

function input(keys = []) {
  const held = new Set(keys);
  return { down: (...codes) => codes.some((code) => held.has(code)) };
}

function playerStub() {
  return {
    model: { visible: true },
    position: new THREE.Vector3(),
    heading: 0,
    inVehicle: false,
    teleport(x, z) {
      this.position.set(x, 0, z);
    },
    sync() {},
  };
}

test("airfield uses the southeast clearing chosen in the live map", () => {
  assert.deepEqual(
    { x: AIRFIELD_SITE.x, z: AIRFIELD_SITE.z },
    { x: 52, z: 50 },
  );
  assert.equal(AIRFIELD_SITE.runwayStart.z, 80);
  assert.ok(AIRFIELD_SITE.runwayEnd.z < AIRFIELD_SITE.runwayStart.z);
});

test("Skybird starts at the beginning of the runway with two propellers", () => {
  const plane = new FlyablePlane(new THREE.Group());
  assert.equal(plane.model.position.x, AIRFIELD_SITE.runwayStart.x);
  assert.equal(plane.model.position.z, AIRFIELD_SITE.runwayStart.z);
  assert.equal(plane.model.position.y, 0);
  assert.equal(plane.model.userData.propellers.length, 2);
  assert.equal(plane.model.userData.flyable, true);
});

test("W takes off and climbs while A and D turn in flight", () => {
  const plane = new FlyablePlane(new THREE.Group());
  const player = playerStub();
  assert.equal(plane.enter(player), true);
  for (let i = 0; i < 300; i++) plane.update(1 / 60, input(["KeyW"]));
  assert.equal(plane.airborne, true);
  assert.ok(plane.model.position.y > 8);
  const heading = plane.heading;
  for (let i = 0; i < 60; i++) plane.update(1 / 60, input(["KeyA"]));
  assert.ok(plane.heading > heading + 0.7);
  for (let i = 0; i < 60; i++) plane.update(1 / 60, input(["KeyD"]));
  assert.ok(Math.abs(plane.heading - heading) < 0.15);
});

test("S descends and flight stays inside the high world boundary", () => {
  const plane = new FlyablePlane(new THREE.Group());
  for (let i = 0; i < 900; i++) plane.update(1 / 60, input(["KeyW", "KeyD"]));
  assert.ok(plane.model.position.y <= PLANE_MAX_ALTITUDE);
  assert.ok(Math.abs(plane.model.position.x) <= PLANE_WORLD_LIMIT);
  assert.ok(Math.abs(plane.model.position.z) <= PLANE_WORLD_LIMIT);
  const altitude = plane.model.position.y;
  for (let i = 0; i < 120; i++) plane.update(1 / 60, input(["KeyS"]));
  assert.ok(plane.model.position.y < altitude);
});

test("leaving the plane returns it to the runway start", () => {
  const plane = new FlyablePlane(new THREE.Group());
  const player = playerStub();
  plane.enter(player);
  for (let i = 0; i < 240; i++) plane.update(1 / 60, input(["KeyW"]));
  assert.notEqual(plane.model.position.z, AIRFIELD_SITE.runwayStart.z);
  assert.equal(plane.exit(player), true);
  assert.equal(plane.model.position.x, AIRFIELD_SITE.runwayStart.x);
  assert.equal(plane.model.position.z, AIRFIELD_SITE.runwayStart.z);
  assert.equal(plane.model.position.y, 0);
  assert.equal(player.model.visible, true);
});
