import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  FLIGHT_HOOPS,
  crossesHoop,
  FlightHoops,
} from "../shared/world/flight-hoops.js";
import { terrainBlocks } from "../shared/world/northern-terrain.js";
import { PLANE_MAX_ALTITUDE } from "../shared/world/airfield.js";

test("all hoop openings clear the mountains and fit under the flight ceiling", () => {
  for (const h of FLIGHT_HOOPS) {
    assert.ok(h.y + h.radius < PLANE_MAX_ALTITUDE);
    for (let a = 0; a < Math.PI * 2; a += 0.2) {
      const r = h.radius - 3.5;
      assert.ok(
        !terrainBlocks(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, h.z),
        "hoop " + h.id + " overlaps terrain",
      );
    }
  }
});
test("hoops require crossing the opening, count both directions, and reject near misses", () => {
  const h = FLIGHT_HOOPS[0],
    a = new THREE.Vector3(h.x, h.y, h.z + 25),
    b = new THREE.Vector3(h.x, h.y, h.z - 25);
  assert.ok(crossesHoop(a, b, h));
  assert.ok(crossesHoop(b, a, h));
  assert.equal(crossesHoop(a, a, h), false);
  a.x += 12;
  b.x += 12;
  assert.equal(crossesHoop(a, b, h), false);
});
test("hoop rewards count once and teleporting after exit cannot award a hoop", () => {
  const hoops = new FlightHoops(new THREE.Group()),
    h = FLIGHT_HOOPS[0];
  const a = new THREE.Vector3(h.x, h.y, h.z + 10),
    b = new THREE.Vector3(h.x, h.y, h.z - 10);
  hoops.update(a, true);
  hoops.update(b, true);
  hoops.update(a, true);
  assert.equal(hoops.passed.size, 1);
  hoops.update(a, false);
  const next = FLIGHT_HOOPS[1];
  hoops.update(new THREE.Vector3(next.x, next.y, next.z - 1), true);
  assert.equal(hoops.passed.size, 1);
});
