import {
  RACE_ENTRY,
  RACE_LANE_LIMIT,
} from "../shared/world/space-race-track.js";

export function runSpaceRaceChecks(game) {
  const race = game.spaceRace,
    results = [],
    original = game.player.model.userData.avatarId,
    calm = game.calm;
  const trophyKey = "crews-place-moonbeam-trophies",
    savedTrophy = localStorage.getItem(trophyKey),
    savedWins = race.wins;
  const assert = (value, msg) => {
    if (!value) throw new Error(msg);
  };
  const check = (name, fn) => {
    try {
      fn();
      results.push("PASS · " + name);
    } catch (e) {
      results.push("FAIL · " + name + " — " + e.message);
      console.error(e);
      race.exit();
    }
  };
  const frames = (n) => {
    for (let i = 0; i < n; i++) game.tick(0.05);
  };
  const press = (key) => {
    game.input.press(key);
    game.tick(0.05);
    game.input.release(key);
  };
  const steer = () => {
    const r = race.run.racers[0];
    const obstacle = race.track.obstacles.find(
      (o) => o.distance > r.distance - 5 && o.distance < r.distance + 85,
    );
    const pad = race.track.boosts.find(
      (b) => b.distance > r.distance && b.distance < r.distance + 65,
    );
    const target = obstacle ? (obstacle.lane < 0 ? 5 : -5) : (pad?.lane ?? 0);
    game.input.release("KeyA");
    game.input.release("KeyD");
    if (target - r.lane > 0.1) game.input.press("KeyD");
    else if (target - r.lane < -0.1) game.input.press("KeyA");
  };
  const board = () => {
    game.enter("space", [RACE_ENTRY.x, RACE_ENTRY.z]);
    frames(15);
    press("KeyE");
    assert(race.occupied && race.run.state === "ready", "cannot board");
  };
  game.start();
  game.calm = false;
  for (const id of ["cowboy", "jolly_robot", "moon_mischief"])
    check(
      `${id}: full race, four jumps, first place, trophy, repeat and safe exit`,
      () => {
        game.pause();
        game.setCharacter(id);
        game.resume();
        board();
        const wins = race.wins;
        race.hud.querySelector(".race-start").click();
        frames(65);
        assert(race.run.state === "racing", "countdown did not launch");
        const jumped = new Set();
        let budget = 3000;
        while (race.run.state !== "finished" && budget--) {
          steer();
          game.tick(0.05);
          const r = race.run.racers[0],
            s = race.track.sample(r.distance);
          if (s.lift > 1)
            jumped.add(
              race.track.jumps.findIndex(
                (j) =>
                  r.distance > j.start &&
                  r.distance < j.start + j.ramp + j.flight,
              ),
            );
          assert(Math.abs(r.lane) <= RACE_LANE_LIMIT, "escaped track");
          assert(
            game.player.model.parent === race.karts[0] &&
              game.player.model.visible,
            "lost character",
          );
          assert(
            game.camera.quaternion.toArray().every(Number.isFinite),
            "invalid camera",
          );
          if (budget % 300 === 0) game.renderer.render(game.scene, game.camera);
        }
        assert(budget > 0, "race stuck");
        assert(jumped.size === 4, "missed jumps");
        assert(
          race.run.elapsed >= 60 && race.run.place === 1,
          "race too short or wrong winner",
        );
        assert(race.wins === wins + 1 && race.trophy.visible, "missing trophy");
        assert(
          Number(localStorage.getItem(trophyKey)) === race.wins,
          "trophy did not persist",
        );
        frames(30);
        assert(race.wins === wins + 1, "duplicate trophy");
        press("KeyE");
        assert(race.run.state === "countdown", "replay failed");
        race.hud.querySelector(".race-exit").click();
        assert(!game.player.inVehicle && !race.occupied, "exit failed");
        assert(
          game.player.model.parent === game.scene &&
            Math.abs(game.player.position.y - game.area.groundY) < 0.01,
          "walking not restored",
        );
      },
    );
  check(
    "pause, throttle toggle, touch steering, gentle mode and keyboard exit",
    () => {
      board();
      race.hud.querySelector(".race-auto").click();
      press("KeyE");
      frames(100);
      assert(race.run.racers[0].distance === 0, "manual throttle ignored");
      game.mobileControls.press("KeyW");
      game.mobileControls.press("KeyD");
      frames(120);
      assert(
        race.run.racers[0].lane === RACE_LANE_LIMIT,
        "touch steering not contained",
      );
      game.mobileControls.release("KeyW");
      game.mobileControls.release("KeyD");
      game.pause();
      const d = race.run.racers[0].distance,
        time = race.run.elapsed;
      frames(60);
      assert(
        race.run.racers[0].distance === d && race.run.elapsed === time,
        "race moved on pause",
      );
      game.resume();
      race.hud.querySelector(".race-gentle").click();
      assert(race.gentle, "gentle button failed");
      game.mobileControls.refresh();
      assert(
        game.mobileControls.root.querySelector(".mobile-jump").hidden,
        "jump control inappropriate",
      );
      press("KeyE");
      assert(!race.occupied, "keyboard safe exit failed");
    },
  );
  check(
    "third place completes with encouragement, awards no trophy, and allows replay",
    () => {
      board();
      race.start();
      game.input.press("KeyS");
      const wins = race.wins;
      let budget = 8500;
      while (race.run.state !== "finished" && budget--) game.tick(0.05);
      assert(budget > 0 && race.run.place === 3, "non-winning race failed");
      assert(race.wins === wins, "third place awarded trophy");
      assert(
        race.hud
          .querySelector(".race-phase")
          .textContent.includes("Course complete"),
        "missing finish message",
      );
      race.start();
      assert(race.run.state === "countdown", "cannot retry");
      race.exit();
    },
  );
  check("character and area changes restore ordinary game state", () => {
    board();
    race.start();
    game.pause();
    game.setCharacter("cowboy");
    assert(!race.occupied, "avatar change left race active");
    game.resume();
    board();
    race.start();
    game.enter("town");
    assert(
      !race.occupied &&
        !game.player.inVehicle &&
        game.player.model.parent === game.scene,
      "area change left racer attached",
    );
  });
  race.exit();
  race.wins = savedWins;
  race.trophy.visible = savedWins > 0;
  if (savedTrophy === null) localStorage.removeItem(trophyKey);
  else localStorage.setItem(trophyKey, savedTrophy);
  game.pause();
  game.setCharacter(original);
  game.resume();
  game.calm = calm;
  game.enter("space", [RACE_ENTRY.x, RACE_ENTRY.z]);
  game.follow.reset(Math.PI / 2);
  const panel = document.createElement("section");
  panel.id = "space-race-test-results";
  panel.style.cssText =
    "position:fixed;inset:24px;z-index:90;padding:24px;overflow:auto;background:#152b40;color:white;border:2px solid #a9efdb";
  const title = document.createElement("h2");
  title.textContent = `${results.filter((r) => r.startsWith("PASS")).length}/${results.length} Moonbeam Rally checks passed`;
  const text = document.createElement("pre");
  text.style.whiteSpace = "pre-wrap";
  text.textContent = results.join("\n");
  const close = document.createElement("button");
  close.textContent = "Try Moonbeam Rally";
  close.onclick = () => {
    panel.remove();
    game.canvas.focus();
  };
  panel.append(title, text, close);
  const inspect = document.createElement("button");
  inspect.textContent = "Inspect a jump";
  inspect.onclick = () => {
    panel.hidden = true;
    race.board();
    race.gentle = false;
    game.calm = false;
    race.start();
    const jump = race.track.jumps[0],
      target = jump.start + jump.ramp + jump.flight / 2;
    let budget = 2000;
    while (race.run.racers[0].distance < target && budget--) game.tick(0.05);
    game.pause();
    game.ui.panel.close();
    race.hud.hidden = true;
    const back = document.createElement("button");
    back.textContent = "Back to race entrance";
    back.style.cssText =
      "position:fixed;bottom:24px;left:24px;z-index:100;padding:14px";
    back.onclick = () => {
      game.resume();
      race.exit();
      game.calm = calm;
      back.remove();
      panel.hidden = false;
    };
    document.body.append(back);
  };
  panel.append(inspect);
  document.body.append(panel);
}
