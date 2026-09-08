import { AIRFIELD_SITE, PLANE_MAX_ALTITUDE } from "../shared/world/airfield.js";

export function runAirfieldChecks(game) {
  const results = [];
  const check = (name, fn) => {
    try {
      fn();
      results.push("PASS · " + name);
    } catch (error) {
      results.push("FAIL · " + name + ": " + error.message);
      console.error(name, error);
    }
  };
  const assert = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  const key = (code, type = "keydown") =>
    window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  const frames = (count) => {
    for (let i = 0; i < count; i++) game.tick(1 / 60);
  };
  const hold = (code, count) => {
    key(code);
    frames(count);
    key(code, "keyup");
  };

  game.start();
  game.player.teleport(
    AIRFIELD_SITE.runwayStart.x + 3.5,
    AIRFIELD_SITE.runwayStart.z,
  );
  frames(1);
  check(
    "Runway, open hangar, and parked plane are in the chosen clearing",
    () => {
      assert(game.airfield.runway.parent, "runway missing");
      assert(
        game.plane.model.parent === game.areas.town.group,
        "plane missing",
      );
      assert(
        game.interactions.current?.id === "skybird-plane",
        "plane prompt missing",
      );
    },
  );
  hold("KeyE", 1);
  check("E enters Skybird and starts flight mode", () => {
    assert(game.flying, "flight mode did not start");
    assert(!game.player.model.visible, "player is visible outside the plane");
    assert(
      !document.querySelector("#flight-status").hidden,
      "flight HUD missing",
    );
  });
  hold("KeyW", 300);
  check("W accelerates down the runway and climbs", () => {
    assert(game.plane.airborne, "plane did not take off");
    assert(game.plane.model.position.y > 8, "plane did not climb");
    assert(
      game.plane.model.position.y <= PLANE_MAX_ALTITUDE,
      "altitude boundary failed",
    );
  });
  const beforeHeading = game.plane.heading;
  hold("KeyA", 60);
  check("A turns the plane left and propellers spin", () => {
    assert(game.plane.heading > beforeHeading + 0.7, "left turn failed");
    assert(
      game.plane.model.userData.propellers.every(
        (propeller) => propeller.rotation.z !== 0,
      ),
      "propellers did not spin",
    );
  });
  hold("KeyE", 1);
  check("E exits and resets Skybird at the runway start", () => {
    assert(!game.flying, "flight mode did not end");
    assert(
      game.plane.model.position.x === AIRFIELD_SITE.runwayStart.x,
      "wrong reset x",
    );
    assert(
      game.plane.model.position.z === AIRFIELD_SITE.runwayStart.z,
      "wrong reset z",
    );
  });

  const panel = document.createElement("section");
  panel.id = "airfield-test-results";
  panel.style.cssText =
    "position:fixed;inset:24px;z-index:50;overflow:auto;background:#f8f7df;color:#214e4b;padding:24px;border-radius:18px;font:16px/1.6 system-ui";
  panel.innerHTML = `<h1>${results.filter((result) => result.startsWith("PASS")).length}/${results.length} airfield browser checks passed</h1><pre>${results.join("\n")}</pre>`;
  document.body.append(panel);
}
