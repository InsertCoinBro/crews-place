import { TUBE_ENTRY, TUBE_EXIT } from "../shared/world/space-tube-track.js";
export function runSpaceTubeChecks(game) {
  const results = [],
    tube = game.spaceTube,
    original = game.player.model.userData.avatarId,
    calm = game.calm;
  const check = (name, fn) => {
    try {
      fn();
      results.push("PASS · " + name);
    } catch (e) {
      results.push("FAIL · " + name + " — " + e.message);
      console.error(e);
    }
  };
  const assert = (ok, msg) => {
    if (!ok) throw new Error(msg);
  };
  const frames = (n) => {
    for (let i = 0; i < n; i++) game.tick(0.05);
  };
  const key = (code) => {
    game.input.press(code);
    game.tick(0.05);
    game.input.release(code);
  };
  game.start();
  game.calm = false;
  check("idle tube effects do not consume the walking frame loop", () => {
    game.enter("space", [TUBE_ENTRY.x - 12, TUBE_ENTRY.z]);
    const version = tube.air.instanceMatrix.version;
    frames(60);
    assert(!tube.occupied, "tube unexpectedly occupied");
    assert(
      tube.air.instanceMatrix.version === version,
      "idle airflow transforms kept uploading",
    );
  });
  for (const id of ["cowboy", "jolly_robot", "moon_mischief"])
    check(
      id + " boards with E, rides all 60 seconds visibly and lands safely",
      () => {
        game.pause();
        game.setCharacter(id);
        game.resume();
        game.enter("space", [TUBE_ENTRY.x - 4, TUBE_ENTRY.z]);
        frames(15);
        key("KeyE");
        assert(tube.occupied, "boarding failed");
        assert(game.player.model.parent === tube.carrier, "not attached");
        assert(
          Math.abs(game.player.model.rotation.x - Math.PI / 2) < 0.01,
          "not belly down",
        );
        frames(100);
        game.pause();
        const d = tube.ride.distance;
        frames(10);
        assert(tube.ride.distance === d, "pause drift");
        game.resume();
        assert(!game.spaceAlien.gun.visible, "bubble launcher active in tube");
        let budget = 1250,
          steps = 0;
        while (tube.occupied && budget--) {
          game.tick(0.05);
          steps++;
          if (steps % 180 === 0) {
            assert(game.player.model.visible, "invisible rider");
            assert(
              game.camera.quaternion.toArray().every(Number.isFinite),
              "bad camera",
            );
            game.renderer.render(game.scene, game.camera);
          }
        }
        assert(budget > 0, "ride never finished");
        assert(steps >= 1090, "ride shorter than 60s");
        assert(!game.player.inVehicle, "vehicle state stuck");
        assert(
          game.player.position.distanceTo({
            x: TUBE_EXIT.x,
            y: game.area.groundY,
            z: TUBE_EXIT.z,
          }) < 0.01,
          "wrong exit",
        );
      },
    );
  check("early exit, side view and gentler motion controls work", () => {
    game.enter("space", [TUBE_ENTRY.x - 4, TUBE_ENTRY.z]);
    frames(15);
    key("KeyE");
    frames(20);
    tube.hud.querySelector(".tube-view").click();
    assert(tube.view === "side", "view failed");
    tube.hud.querySelector(".tube-gentle").click();
    assert(tube.gentle, "gentler option failed");
    const t = tube.ride.elapsed;
    frames(20);
    assert(tube.ride.elapsed - t < 0.8, "gentle speed unchanged");
    tube.hud.querySelector(".tube-exit").click();
    assert(!tube.occupied && !game.player.inVehicle, "early exit failed");
  });
  check("changing avatars and areas while riding cleans up", () => {
    tube.board();
    game.pause();
    game.setCharacter("cowboy");
    assert(!tube.occupied, "character switch left ride active");
    game.resume();
    tube.board();
    game.enter("town");
    assert(
      !tube.occupied && game.player.model.parent === game.scene,
      "area change left attached rider",
    );
  });
  game.pause();
  game.setCharacter(original);
  game.resume();
  game.calm = calm;
  game.enter("space", [TUBE_ENTRY.x - 5, TUBE_ENTRY.z]);
  game.follow.reset(-Math.PI / 2);
  const panel = document.createElement("section");
  panel.id = "space-tube-test-results";
  panel.style.cssText =
    "position:fixed;inset:24px;z-index:90;padding:24px;overflow:auto;background:#122642;color:white;border:2px solid #91ffee";
  const title = document.createElement("h2");
  title.textContent = `${results.filter((s) => s.startsWith("PASS")).length}/${results.length} Slipstream checks passed`;
  const text = document.createElement("pre");
  text.style.whiteSpace = "pre-wrap";
  text.textContent = results.join("\n");
  const close = document.createElement("button");
  close.textContent = "Explore the tube ride";
  close.onclick = () => {
    panel.remove();
    game.canvas.focus();
  };
  panel.append(title, text, close);
  document.body.append(panel);
}
