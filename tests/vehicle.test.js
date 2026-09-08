import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { TRAFFIC_ROUTES } from "../shared/world/traffic.js";
import {
  DriveableCar,
  PLAYER_CAR_SPEED,
} from "../shared/world/vehicle.js";

const carStart =
  TRAFFIC_ROUTES[1].segments.slice(0, 5).reduce((a, b) => a + b, 0) + 14;

function input(keys = []) {
  const held = new Set(keys);
  return { down: (...codes) => codes.some((code) => held.has(code)) };
}

function playerStub() {
  return {
    model: { visible: true },
    position: new THREE.Vector3(),
    heading: 0,
    teleport(x, z) {
      this.position.set(x, 0, z);
    },
    sync() {},
  };
}

test("player car starts on the east street beside Meadow Park", () => {
  const car = new DriveableCar(new THREE.Group(), TRAFFIC_ROUTES[1], carStart);
  assert.equal(PLAYER_CAR_SPEED, 8.64);
  assert.ok(Math.abs(car.model.position.x - 22.8) < 0.01);
  assert.ok(Math.abs(car.model.position.z - 6) < 0.01);
  assert.equal(car.model.userData.driveable, true);
  assert.equal(car.model.userData.wheels.length, 4);
  assert.ok(
    Math.abs(car.cameraYaw() - (car.model.rotation.y + Math.PI)) < 1e-9,
  );
});

test("W and S drive the car around the closed street route", () => {
  const car = new DriveableCar(new THREE.Group(), TRAFFIC_ROUTES[1], carStart);
  const before = car.distance;
  car.update(1, input(["KeyW"]));
  assert.ok(car.distance > before);
  assert.ok(car.speed > 0 && car.speed < PLAYER_CAR_SPEED);
  const forwardDistance = car.distance;
  car.update(1, input(["KeyS"]));
  assert.ok(car.distance < forwardDistance);
  for (let i = 0; i < 120; i++) car.update(1 / 60, input());
  assert.ok(Math.abs(car.speed) < 0.01);
});

test("entering and exiting preserves the car's route position", () => {
  const car = new DriveableCar(new THREE.Group(), TRAFFIC_ROUTES[1], carStart);
  const player = playerStub();
  assert.equal(car.enter(player), true);
  assert.equal(car.occupied, true);
  assert.equal(player.model.visible, false);
  const parkedDistance = car.distance;
  car.update(1 / 60, input());
  assert.equal(car.distance, parkedDistance);
  assert.equal(car.exit(player), true);
  assert.equal(car.occupied, false);
  assert.equal(player.model.visible, true);
  assert.equal(car.distance, parkedDistance);
});
