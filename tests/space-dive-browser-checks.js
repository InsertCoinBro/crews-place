import { SPACE_DIVE_EXIT } from "../shared/world/space-dive-track.js";
import { COASTER_EXIT } from "../shared/world/coaster-track.js";

export function runSpaceDiveChecks(game) {
  const button = document.createElement("button");
  button.textContent = "Run Space Dive checks";
  button.style.cssText =
    "position:absolute;top:160px;left:20px;z-index:40;padding:16px;background:#162c4c;color:white;border:2px solid #7eeeff;border-radius:12px";
  button.onclick = () => {
    button.remove();
    executeChecks(game);
  };
  document.body.append(button);
}

function executeChecks(game) {
  const results = [],
    ride = game.spaceDive;
  const assert = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  const check = (name, fn) => {
    try {
      fn();
      results.push("PASS · " + name);
    } catch (error) {
      results.push("FAIL · " + name + ": " + error.message);
      console.error(error);
    }
  };
  const frames = (n) => {
    for (let i = 0; i < n; i++) game.tick(1 / 60);
  };
  const key = (code) => {
    window.dispatchEvent(new KeyboardEvent("keydown", { code, bubbles: true }));
    game.tick(1 / 60);
    window.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true }));
  };
  game.start();
  game.player.teleport(SPACE_DIVE_EXIT.x, SPACE_DIVE_EXIT.z);
  game.follow.reset(0);
  frames(60);
  const startAvatar = game.player.model.userData.avatarId;
  check("Station E boards Space Dive and waits for a separate launch", () => {
    key("KeyE");
    frames(60);
    assert(
      ride.ride.state === "seated",
      "boarding failed: " +
        JSON.stringify({
          mode: game.mode,
          near: game.interactions.current?.id,
          state: ride.ride.state,
          vehicle: game.player.inVehicle,
          cooldown: game.interactionCooldown,
        }),
    );
    assert(ride.ride.distance === 0, "automatic launch");
    assert(
      game.player.model.parent === ride.cars[0] && game.player.model.visible,
      "character not visibly in cart",
    );
    assert(!game.coaster.occupied, "Rainbow Rush activated instead");
    assert(
      document.querySelectorAll("#coaster-launch").length === 1 &&
        document.querySelectorAll("#space-dive-launch").length === 1,
      "duplicate controls",
    );
  });
  check("Launch, walking lockout, and pause/resume work", () => {
    ride.launchButton.click();
    frames(90);
    assert(ride.ride.distance > 0, "launch failed");
    key("Space");
    key("KeyW");
    assert(
      game.player.position.distanceTo(ride.cars[0].position) < 0.01,
      "rider escaped",
    );
    game.pause();
    const d = ride.ride.distance;
    frames(60);
    assert(ride.ride.distance === d, "paused ride moved");
    game.resume();
    frames(30);
    assert(ride.ride.distance > d, "resume failed");
  });
  check(
    "Continuous ascent reveals the existing moon, planet, and playground",
    () => {
      let budget = 4000;
      while (ride.ride.distance < ride.track.panoramaStart + 10 && budget--)
        game.tick(1 / 60);
      assert(budget > 0, "did not reach space");
      assert(game.player.position.y > 210, "too low");
      assert(ride.spaceMix === 1, "sky did not transition");
      assert(game.areas.space.group.visible, "existing space layer invisible");
      for (const name of [
        "walkable-space-ground",
        "distant-blue-planet",
        "space-star-field",
      ])
        assert(game.areas.space.group.getObjectByName(name), "missing " + name);
      assert(game.scene.background.r < 0.01, "space sky is not dark");
      game.renderer.render(game.scene, game.camera);
      assert(
        game.renderer.getContext().getError() === 0,
        "WebGL error in space",
      );
    },
  );
  check("Front-seat view and gentle camera remain usable in space", () => {
    key("KeyC");
    assert(
      ride.view === "front" && !game.player.model.visible,
      "front-seat view obscured",
    );
    game.calm = true;
    frames(10);
    assert(game.camera.up.y === 1, "gentle camera tilts");
    assert(
      game.camera.position.toArray().every(Number.isFinite),
      "invalid camera",
    );
    key("KeyC");
    game.calm = false;
  });
  check(
    "Fast dive returns to the exact station and restores the daylight scene",
    () => {
      let maxSpeed = 0,
        budget = 4000;
      while (ride.ride.state === "riding" && budget--) {
        game.tick(1 / 60);
        maxSpeed = Math.max(maxSpeed, ride.ride.speed);
      }
      assert(ride.ride.state === "arrived", "ride failed to finish");
      assert(maxSpeed > 50, "dive too slow");
      assert(
        ride.cars[0].position.distanceTo(ride.track.points[0]) < 0.001,
        "station missed",
      );
      assert(ride.ride.speed === 0, "did not stop");
      assert(
        !game.areas.space.group.visible && ride.spaceMix === 0,
        "space remained visible on the ground",
      );
      ride.exitButton.click();
      assert(
        game.player.model.parent === game.scene && !game.player.inVehicle,
        "rider not restored",
      );
      assert(
        game.player.position.x === SPACE_DIVE_EXIT.x &&
          game.player.position.z === SPACE_DIVE_EXIT.z,
        "wrong exit",
      );
      assert(
        game.camera.far === 320 && game.scene.environmentIntensity === 1,
        "environment not restored",
      );
    },
  );
  check(
    "Replay, early return from space, and both avatars restore cleanly",
    () => {
      for (const avatar of game.characters.keys()) {
        game.pause();
        game.setCharacter(avatar);
        game.resume();
        frames(60);
        key("KeyE");
        ride.launchButton.click();
        let budget = 4000;
        while (ride.ride.distance < ride.track.panoramaStart && budget--)
          game.tick(1 / 60);
        assert(
          ride.occupied && game.player.model.parent === ride.cars[0],
          "avatar not aboard",
        );
        ride.exitButton.click();
        assert(
          !game.areas.space.group.visible && !game.player.inVehicle,
          "early return leaked space state",
        );
      }
      game.pause();
      game.setCharacter(startAvatar);
      game.resume();
    },
  );
  check("Rainbow Rush still boards and launches independently", () => {
    game.player.teleport(COASTER_EXIT.x, COASTER_EXIT.z);
    frames(60);
    key("KeyE");
    assert(game.coaster.occupied && !ride.occupied, "wrong coaster boarded");
    key("KeyE");
    frames(60);
    assert(
      game.coaster.ride.state === "riding",
      "Rainbow Rush failed to launch",
    );
    game.coaster.exit();
  });
  game.player.teleport(SPACE_DIVE_EXIT.x, SPACE_DIVE_EXIT.z + 3);
  game.follow.reset(0);
  frames(60);
  const panel = document.createElement("section");
  panel.id = "space-dive-test-results";
  panel.style.cssText =
    "position:absolute;left:16px;top:180px;z-index:30;max-width:700px;max-height:50vh;overflow:auto;padding:16px;border-radius:14px;background:#102440ee;color:#d9f3ff;font:12px/1.6 monospace";
  const title = document.createElement("strong");
  title.textContent = `${results.filter((r) => r.startsWith("PASS")).length}/${results.length} Space Dive browser checks passed`;
  panel.append(title);
  for (const result of results) {
    const row = document.createElement("div");
    row.textContent = result;
    panel.append(row);
  }
  const show = (distance, front = false) => {
    if (ride.occupied) ride.exit();
    game.setMode("playing");
    game.player.teleport(SPACE_DIVE_EXIT.x, SPACE_DIVE_EXIT.z);
    ride.board();
    ride.ride.state = "riding";
    ride.ride.distance = distance;
    ride.placeTrain();
    ride.view = front ? "front" : "follow";
    ride.updateHUD();
    for (let i = 0; i < 90; i++) ride.updateCamera(1 / 60);
    ride.applyEnvironment();
    game.setMode("paused");
    panel.hidden = true;
  };
  for (const [text, fn] of [
    ["Inspect space view", () => show(ride.track.panoramaStart + 45)],
    ["Inspect front-seat dive", () => show(ride.track.panoramaEnd + 35, true)],
    [
      "Inspect launch station",
      () => {
        if (ride.occupied) ride.exit();
        game.setMode("playing");
        game.player.teleport(SPACE_DIVE_EXIT.x, SPACE_DIVE_EXIT.z + 3);
        game.follow.reset(0);
        panel.hidden = true;
      },
    ],
  ]) {
    const button = document.createElement("button");
    button.textContent = text;
    button.onclick = fn;
    panel.append(button);
  }
  document.body.append(panel);
}
