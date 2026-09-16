import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { AIRFIELD_SITE } from "../shared/world/airfield.js";
import {
  makeRocket,
  rocketSurfaceHeight,
  RocketJourney,
  ROCKET_PHASES,
  ROCKET_SITE,
} from "../shared/world/rocket.js";
import { SPACE_ALTITUDE, SPACE_LANDING_SITE } from "../shared/world/space.js";

function areas() {
  const scene = new THREE.Scene();
  const town = {
    group: new THREE.Group(),
    cameraMeshes: [],
    colliders: [],
  };
  const space = {
    group: new THREE.Group(),
    cameraMeshes: [],
    colliders: [],
  };
  space.group.position.y = SPACE_ALTITUDE;
  space.group.visible = false;
  scene.add(town.group, space.group);
  return { scene, town, space };
}

test("the rocket launch pad sits beside the runway and hangar", () => {
  assert.ok(Math.abs(ROCKET_SITE.x - AIRFIELD_SITE.x) < 20);
  assert.ok(
    Math.hypot(
      ROCKET_SITE.x - AIRFIELD_SITE.hangar.x,
      ROCKET_SITE.z - AIRFIELD_SITE.hangar.z,
    ) < 24,
  );
});

test("the ladder climbs continuously from ground to the boarding platform", () => {
  assert.equal(rocketSurfaceHeight(ROCKET_SITE.x, ROCKET_SITE.ladderFarZ), 0);
  const middleZ = (ROCKET_SITE.ladderFarZ + ROCKET_SITE.ladderNearZ) / 2;
  assert.ok(
    Math.abs(
      rocketSurfaceHeight(ROCKET_SITE.x, middleZ) - ROCKET_SITE.platformY / 2,
    ) < 0.001,
  );
  assert.equal(
    rocketSurfaceHeight(ROCKET_SITE.x, ROCKET_SITE.doorZ),
    ROCKET_SITE.platformY,
  );
  assert.equal(rocketSurfaceHeight(ROCKET_SITE.x + 4, middleZ), 0);
});

test("the rocket has a door, window, engine, and animated fire system", () => {
  const rocket = makeRocket();
  for (const name of [
    "rocket-body",
    "rocket-door",
    "rocket-window",
    "rocket-engine",
    "rocket-fire",
    "rocket-outer-flame",
    "rocket-inner-flame",
    "rocket-fire-sparks",
  ])
    assert.ok(rocket.getObjectByName(name), `missing ${name}`);
  assert.equal(rocket.userData.exhaust.visible, false);
});

test("the full journey shows ignition, ascent, space, and a pad landing", () => {
  const { scene, town, space } = areas();
  const journey = new RocketJourney(scene, town, space);
  assert.equal(journey.begin(), true);
  assert.equal(journey.model.parent, scene);

  let state = journey.update(ROCKET_PHASES.boardingEnd + 0.5);
  assert.equal(state.stage, "Engines glowing");
  assert.equal(journey.model.userData.exhaust.visible, true);

  state = journey.update(ROCKET_PHASES.ascentEnd - journey.elapsed - 0.5);
  assert.ok(state.stage.includes("atmosphere"));
  assert.ok(journey.model.position.y > 100);
  assert.ok(state.skyMix > 0.5);

  state = journey.update(1);
  assert.equal(state.stage, "Entering space");
  assert.equal(town.group.visible, false);
  assert.equal(space.group.visible, true);

  state = journey.update(ROCKET_PHASES.landingEnd - journey.elapsed);
  assert.equal(state.arrived, true);
  journey.dockInSpace();
  assert.equal(journey.model.parent, space.group);
  assert.equal(journey.model.position.x, SPACE_LANDING_SITE.x);
  assert.equal(journey.model.position.y, journey.baseY);
  assert.equal(journey.model.position.z, SPACE_LANDING_SITE.z);
  assert.equal(journey.arrived, true);
  assert.equal(space.colliders.length, 1);
});

test("return flight lifts from space, descends over town, and supports repeat trips", () => {
  const { scene, town, space } = areas();
  const journey = new RocketJourney(scene, town, space);
  for (let trip = 0; trip < 2; trip++) {
    assert.equal(journey.begin(), true);
    journey.skip();
    journey.update(0);
    journey.dockInSpace();
    assert.equal(journey.begin(true), true);
    journey.update(6);
    assert.ok(journey.model.position.y > SPACE_ALTITUDE + 10);
    assert.equal(space.group.visible, true);
    assert.equal(journey.model.userData.exhaust.visible, true);
    const state = journey.update(5);
    assert.equal(town.group.visible, true);
    assert.equal(space.group.visible, false);
    assert.ok(state.skyMix < 1);
    const altitude = journey.model.position.y;
    journey.update(3);
    assert.ok(journey.model.position.y < altitude);
    journey.skip();
    assert.equal(journey.update(0).arrived, true);
    journey.dockInTown();
    assert.equal(journey.model.parent, town.group);
    assert.equal(journey.model.position.y, journey.baseY);
    assert.equal(journey.model.position.x, ROCKET_SITE.x);
    assert.equal(town.colliders.length, 1);
    assert.equal(space.colliders.length, 0);
    assert.equal(town.cameraMeshes.length, 1);
    assert.equal(space.cameraMeshes.length, 0);
  }
});
