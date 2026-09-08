import { FARM_ANIMALS, FARM_BOUNDS, FARM_SITE } from "../shared/world/farm.js";
import { overlapsCircle } from "../shared/core/physics.js";

export function runFarmChecks(game) {
  const results = [];
  const check = (name, fn) => {
    try {
      fn();
      results.push(`PASS · ${name}`);
    } catch (error) {
      results.push(`FAIL · ${name} · ${error.message}`);
    }
  };
  const assert = (value, message) => {
    if (!value) throw new Error(message);
  };
  check("Farm is anchored at the chosen open-countryside position", () => {
    assert(
      FARM_SITE.playerAnchor.x === -52 && FARM_SITE.playerAnchor.z === 50,
      "anchor changed",
    );
    assert(
      game.farm.group.parent === game.areas.town.group,
      "farm is outside town world",
    );
    assert(
      game.player.position.x === -52 && game.player.position.z === 50,
      "preview did not place player at chosen spot",
    );
  });
  check("Eight animals, stalls, and learning signs are ready", () => {
    assert(
      game.farm.animals.length === FARM_ANIMALS.length,
      "animal count mismatch",
    );
    assert(
      game.farm.stalls.length === FARM_ANIMALS.length,
      "stall count mismatch",
    );
    const signs = game.interactions.items.filter(
      (item) => item.kind === "farm-sign",
    );
    assert(signs.length === FARM_ANIMALS.length, "sign count mismatch");
  });
  check("Every stall gate is open to the player", () => {
    for (const stall of game.farm.stalls) {
      const blocked = game.areas.town.colliders.some((box) =>
        overlapsCircle(stall.gate.x, stall.gate.z, 0.36, box),
      );
      assert(!blocked, `${stall.name} gate is blocked`);
    }
  });
  check("Each sign opens a readable, replayable fact card", () => {
    for (const animal of FARM_ANIMALS) {
      assert(game.farm.openSign(animal.id), `${animal.name} sign did not open`);
      assert(!game.farm.card.hidden, "fact card is hidden");
      assert(
        game.farm.card.querySelector("h2").textContent.includes(animal.name),
        "wrong animal title",
      );
      assert(
        game.farm.card.querySelector("[data-animal-intro]").textContent ===
          animal.fact,
        "wrong animal fact",
      );
      assert(
        game.farm.card.querySelector("[data-animal-job]").textContent ===
          animal.job &&
          game.farm.card.querySelector("[data-animal-food]").textContent ===
            animal.food &&
          game.farm.card.querySelector("[data-animal-sound]").textContent ===
            animal.sound,
        "read-aloud sections are incomplete",
      );
      assert(game.farm.speak(), `${animal.name} narration did not start`);
      assert(game.farm.audio, `${animal.name} has no bundled narration track`);
      assert(
        game.farm.lastNarration
          .toLowerCase()
          .includes(animal.name.toLowerCase()),
        "spoken lesson omitted animal name",
      );
    }
    game.farm.closeSign();
  });
  check("Barn, silo, hay, bushes, crops, and farm meadow exist", () => {
    for (const name of [
      "big-red-barn",
      "farm-silo",
      "hay-bale",
      "farm-bush",
      "farm-meadow",
      "water-trough",
      "pig-mud-patch",
      "duck-pond",
      "chicken-coop",
      "rabbit-hutch",
    ])
      assert(game.farm.group.getObjectByName(name), `${name} missing`);
    assert(FARM_BOUNDS.maxX - FARM_BOUNDS.minX >= 90, "farm is too small");
  });
  const panel = document.createElement("section");
  panel.id = "farm-test-results";
  panel.style.cssText =
    "position:absolute;left:16px;top:185px;z-index:30;max-width:680px;padding:16px;border-radius:14px;background:#fffaf0ed;color:#194f69;font:12px/1.55 monospace";
  const title = document.createElement("strong");
  title.textContent = `${results.filter((r) => r.startsWith("PASS")).length}/${results.length} farm browser checks passed`;
  panel.append(title);
  for (const result of results) {
    const row = document.createElement("div");
    row.textContent = result;
    panel.append(row);
  }
  document.querySelector("#game").append(panel);
}
