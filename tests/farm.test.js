import test from "node:test";
import assert from "node:assert/strict";
import {
  FARM_ANIMALS,
  FARM_BOUNDS,
  FARM_SITE,
  narrationFor,
} from "../shared/world/farm.js";

test("farm uses the player's countryside location and a coaster-sized footprint", () => {
  assert.deepEqual(FARM_SITE.playerAnchor, { x: -52, z: 50 });
  assert.equal(FARM_BOUNDS.maxX - FARM_BOUNDS.minX, 90);
  assert.equal(FARM_BOUNDS.maxZ - FARM_BOUNDS.minZ, 58);
  assert.ok(
    FARM_SITE.playerAnchor.x >= FARM_BOUNDS.minX &&
      FARM_SITE.playerAnchor.x <= FARM_BOUNDS.maxX,
  );
  assert.ok(
    FARM_SITE.playerAnchor.z >= FARM_BOUNDS.minZ &&
      FARM_SITE.playerAnchor.z <= FARM_BOUNDS.maxZ,
  );
});

test("eight distinct farm animals each have a useful spoken lesson", () => {
  assert.equal(FARM_ANIMALS.length, 8);
  assert.equal(
    new Set(FARM_ANIMALS.map((animal) => animal.id)).size,
    FARM_ANIMALS.length,
  );
  for (const animal of FARM_ANIMALS) {
    assert.ok(
      animal.fact.length > 70,
      `${animal.name} needs a meaningful fact`,
    );
    for (const field of ["job", "food", "sound"])
      assert.ok(
        animal[field].length > 2,
        `${animal.name} needs a ${field} section`,
      );
    const narration = narrationFor(animal);
    assert.match(narration, new RegExp(animal.name, "i"));
    assert.ok(narration.includes(animal.job));
    assert.ok(narration.includes(animal.food));
    assert.ok(narration.includes(animal.sound));
  }
});
