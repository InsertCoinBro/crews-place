import { ROCKET_SITE } from "../shared/world/rocket.js";
import { SPACE_ALTITUDE, SPACE_LANDING_SITE } from "../shared/world/space.js";

export function runRocketChecks(game) {
  const results = [];
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const check = (name, run) => {
    try {
      run();
      results.push("PASS · " + name);
    } catch (error) {
      results.push("FAIL · " + name + ": " + error.message);
      console.error(name, error);
    }
  };
  const key = (code, type = "keydown") =>
    window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  const frames = (count) => {
    for (let frame = 0; frame < count; frame++) game.tick(1 / 60);
  };
  const hold = (code, count) => {
    key(code);
    frames(count);
    key(code, "keyup");
  };

  game.start();
  game.player.teleport(ROCKET_SITE.x, ROCKET_SITE.ladderFarZ + 0.4);
  game.follow.reset(0);
  frames(1);

  check("Rocket, pad, platform, and ladder are beside Skybird Airfield", () => {
    for (const name of [
      "starbound-rocket",
      "rocket-launch-pad",
      "rocket-boarding-platform",
      "rocket-ladder-rail",
      "rocket-ladder-rung",
    ])
      assert(game.areas.town.group.getObjectByName(name), `missing ${name}`);
    assert(
      game.interactions.current?.id === "starbound-rocket-ladder",
      "ladder prompt missing",
    );
  });

  hold("KeyW", 110);
  frames(1);
  check("Walking forward climbs to the elevated rocket door", () => {
    assert(
      Math.abs(game.player.position.y - ROCKET_SITE.platformY) < 0.01,
      "player did not reach platform height",
    );
    assert(
      game.interactions.current?.id === "starbound-rocket-door",
      "door interaction missing at platform",
    );
  });

  hold("KeyE", 1);
  check("E at the door boards the rocket and starts the journey", () => {
    assert(game.mode === "rocket", "rocket journey did not start");
    assert(game.player.model.visible === false, "player remained outside");
    assert(
      !document.querySelector("#rocket-status").hidden,
      "journey status is hidden",
    );
  });

  frames(120);
  check("Ignition shows animated rocket fire", () => {
    assert(game.rocket.model.userData.exhaust.visible, "rocket fire is hidden");
    assert(
      game.rocket.model.getObjectByName("rocket-fire-sparks"),
      "fire sparks are missing",
    );
  });

  frames(330);
  check("Ascent lifts above the visible town and darkens the sky", () => {
    assert(game.rocket.model.position.y > 80, "rocket did not climb");
    assert(game.areas.town.group.visible, "town vanished too early");
    assert(game.rocket.model.parent === game.scene, "rocket is not in flight");
  });

  frames(180);
  check("The journey crosses into the existing space environment", () => {
    assert(!game.areas.town.group.visible, "town remained visible in space");
    assert(game.areas.space.group.visible, "space did not appear");
  });

  frames(420);
  check("Landing restores walking beside the space rocket", () => {
    assert(game.mode === "playing", "walking controls were not restored");
    assert(game.area.id === "space", "player did not arrive in space");
    assert(game.player.position.y === SPACE_ALTITUDE, "wrong landing altitude");
    assert(game.player.model.visible, "player remained hidden after landing");
    assert(game.rocket.arrived, "rocket is not docked");
    assert(
      game.rocket.model.parent === game.areas.space.group,
      "rocket did not dock on the space pad",
    );
    assert(
      game.rocket.model.position.x === SPACE_LANDING_SITE.x &&
        game.rocket.model.position.z === SPACE_LANDING_SITE.z,
      "rocket missed the landing pad",
    );
  });

  game.player.teleport(SPACE_LANDING_SITE.x + 3, SPACE_LANDING_SITE.z + 2);
  game.player.position.y = SPACE_ALTITUDE;
  game.player.sync();
  frames(1);
  check("Walking beside the space rocket offers a return interaction", () => {
    assert(
      game.interactions.current?.id === "starbound-rocket-return",
      "return prompt missing",
    );
  });
  hold("KeyE", 1);
  frames(360);
  check(
    "E boards for home and the rocket lifts visibly off the space pad",
    () => {
      assert(
        game.mode === "rocket" && game.rocket.returning,
        "return did not start",
      );
      assert(
        game.rocket.model.position.y > SPACE_ALTITUDE + 10,
        "rocket did not lift off",
      );
      assert(
        game.areas.space.group.visible &&
          game.rocket.model.userData.exhaust.visible,
        "space launch or fire missing",
      );
    },
  );
  frames(480);
  check(
    "Return descent reveals the town and approaches the original pad",
    () => {
      assert(
        game.areas.town.group.visible && !game.areas.space.group.visible,
        "town not visible",
      );
      assert(
        game.rocket.model.position.y < 150 && game.rocket.model.position.y > 1,
        "descent missing",
      );
      assert(
        game.rocket.model.position.x === ROCKET_SITE.x,
        "wrong landing site",
      );
    },
  );
  frames(180);
  check(
    "Home touchdown restores walking and makes another launch available",
    () => {
      assert(
        game.mode === "playing" && game.area.id === "town",
        "not back in town",
      );
      assert(
        game.player.model.visible && game.player.position.y === 0,
        "player not restored on land",
      );
      assert(
        game.rocket.model.parent === game.areas.town.group &&
          !game.rocket.arrived,
        "rocket not parked at home",
      );
      assert(
        game.rocketInteraction.area === "town",
        "outbound interaction not restored",
      );
      const before = game.player.position.clone();
      hold("KeyW", 10);
      assert(
        game.player.position.distanceTo(before) > 0.1,
        "walking is still locked",
      );
    },
  );

  const panel = document.createElement("section");
  panel.id = "rocket-test-results";
  panel.style.cssText =
    "position:fixed;inset:24px;z-index:60;overflow:auto;background:#111d32f2;color:#eef5ff;padding:24px;border:2px solid #f5d477;border-radius:18px;font:15px/1.6 system-ui";
  panel.innerHTML = `<h1>${results.filter((result) => result.startsWith("PASS")).length}/${results.length} rocket browser checks passed</h1><pre>${results.join("\n")}</pre>`;
  document.body.append(panel);
}
