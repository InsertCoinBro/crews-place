import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { FlyablePlane, PLANE_MAX_ALTITUDE } from "../shared/world/airfield.js";
import { MOUNTAINS, terrainBlocks } from "../shared/world/northern-terrain.js";
import { sampleWeather, Weather } from "../shared/world/weather.js";

test("mountains exceed flight ceiling and block swept movement without tunnelling", () => {
  const m = MOUNTAINS[0];
  assert.ok(m.height > PLANE_MAX_ALTITUDE);
  const plane = new FlyablePlane(new THREE.Group());
  plane.model.position.set(m.x, 72, m.z + 65);
  plane.airborne = true;
  plane.speed = 30;
  plane.throttle = 1;
  for (let i = 0; i < 60; i++) plane.update(0.05, { down: () => false });
  assert.ok(plane.terrainContact);
  assert.ok(
    !terrainBlocks(
      ...[
        plane.model.position.x,
        plane.model.position.y,
        plane.model.position.z,
      ],
    ),
  );
});
test("weather transitions, altitude dependence and calm mode keep gusts bounded", () => {
  assert.ok(sampleWeather({ z: -400, y: 60 }).rain > 0.9);
  assert.ok(sampleWeather({ z: -1000, y: 60 }).windX > 2);
  assert.ok(sampleWeather({ z: -1600, y: 60 }).snow > 0.9);
  assert.equal(sampleWeather({ z: -2200, y: 60 }).windX, 0);
  assert.equal(sampleWeather({ z: -1000, y: 0 }).windX, 0);
  const a = sampleWeather({ z: -1000, y: 60 }, 3),
    b = sampleWeather({ z: -1000, y: 60 }, 3, true);
  assert.ok(b.windX < a.windX);
  for (let z = -100; z > -2100; z--) {
    const a = sampleWeather({ z, y: 50 }, 5),
      b = sampleWeather({ z: z - 1, y: 50 }, 5);
    assert.ok(Math.abs(a.windX - b.windX) < 0.15);
  }
});
test("wind changes aircraft position and gentle mode reduces the drift", () => {
  const planes = [false, true].map((gentle) => {
    const p = new FlyablePlane(new THREE.Group());
    p.model.position.set(0, 50, -1000);
    p.airborne = true;
    p.gentleWeather = gentle;
    for (let i = 0; i < 60; i++) p.update(1 / 60, { down: () => false });
    return p;
  });
  assert.ok(planes[0].model.position.x > planes[1].model.position.x + 1);
});
test("weather particle pool is reused and hidden outside the town", () => {
  const w = new Weather(new THREE.Group());
  const array = w.positions;
  w.update(1, new THREE.Vector3(0, 50, -400), true, false);
  assert.ok(w.geometry.drawRange.count > 0);
  w.update(1, new THREE.Vector3(0, 50, -1600), true, true);
  assert.equal(w.positions, array);
  w.update(0, new THREE.Vector3(), false, false);
  assert.equal(w.group.visible, false);
});
