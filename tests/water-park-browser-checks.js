import {
  WATER_PARK_EXIT,
  WATER_SLIDES,
  WATER_POOL,
} from "../shared/world/water-park-track.js";

export function addWaterParkChecks(game) {
  const launch = document.createElement("button");
  launch.textContent = "Run water park checks";
  launch.style.cssText =
    "position:absolute;top:90px;left:16px;z-index:100;padding:14px";
  document.body.append(launch);
  const park = game.waterPark,
    assert = (ok, message) => {
      if (!ok) throw Error(message);
    };
  const frames = (n) => {
    for (let i = 0; i < n; i++) game.tick(1 / 60);
  };
  const advance = (until, budget = 16000) => {
    while (!until() && budget--) park.update(1 / 60);
    assert(budget > 0, "state transition timed out: " + park.ride.state);
  };
  const key = (code) => {
    game.input.press(code);
    game.tick(1 / 60);
    game.input.release(code);
  };
  const enter = (index) => {
    if (park.occupied) park.exit();
    game.setMode("playing");
    const e = WATER_SLIDES[index].entry;
    game.player.teleport(e.x, e.z);
    frames(40);
    assert(
      game.interactions.current?.id === `water-lift-${index}`,
      "wrong entrance prompt",
    );
    key("KeyE");
    assert(
      park.track.index === index && park.ride.state === "lifting",
      "wrong lift",
    );
    advance(() => park.ride.state === "seated");
  };
  const swimOut = () => {
    park.swimYaw = Math.PI;
    let budget = 3000;
    while (park.swimming && budget--) {
      const p = game.player.position,
        dx = WATER_POOL.exitX - p.x,
        dz = WATER_POOL.exitZ - p.z;
      game.input.clear();
      if (Math.abs(dx) > 1) game.input.press(dx > 0 ? "KeyA" : "KeyD");
      if (Math.abs(dz) > 1) game.input.press(dz > 0 ? "KeyW" : "KeyS");
      park.update(1 / 60);
    }
    game.input.clear();
    assert(budget > 0, "swimming controls cannot reach steps");
    advance(() => !park.occupied, 400);
    assert(
      !game.player.inVehicle && game.player.model.parent === game.scene,
      "still attached",
    );
    assert(
      Math.abs(game.player.position.z - WATER_POOL.shoreZ) < 0.01,
      "not on dry shore",
    );
  };
  let panel;
  const show = (name, fn) => {
    const button = document.createElement("button");
    button.textContent = name;
    button.style.cssText = "min-height:44px;padding:8px;margin:4px";
    button.onclick = () => {
      panel.hidden = true;
      fn();
    };
    panel.append(button);
  };
  launch.onclick = () => {
    launch.remove();
    const results = [],
      original = game.player.model.userData.avatarId,
      originalCalm = game.calm;
    const check = (name, fn) => {
      try {
        fn();
        results.push("PASS · " + name);
      } catch (error) {
        results.push("FAIL · " + name + ": " + error.message);
        console.error(error);
        if (park.occupied) park.exit();
        game.setMode("playing");
      }
    };
    game.start();
    check(
      "Three separate entrances board their own lifts and wait at the top",
      () => {
        for (let i = 0; i < 3; i++) {
          enter(i);
          assert(park.ride.distance === 0, "auto launch");
          assert(
            Math.abs(game.player.position.y - WATER_SLIDES[i].height) < 0.01,
            "wrong lift height",
          );
          assert(
            game.player.model.parent === park.cars[0],
            "rider not in raft",
          );
          park.exit();
        }
      },
    );
    check(
      "Every route drops into the pool and requires swimming to climb out",
      () => {
        for (let i = 0; i < 3; i++) {
          enter(i);
          park.launchButton.click();
          assert(park.ride.state === "riding", "start failed");
          advance(() => park.ride.state === "dropping");
          assert(
            park.cars[0].position.y > WATER_POOL.surface + 5,
            "no air gap",
          );
          advance(() => park.swimming);
          assert(
            game.player.model.parent === game.scene && !park.cars[0].visible,
            "did not leave raft",
          );
          const p = game.player.position.clone();
          for (let j = 0; j < 60; j++) park.update(1 / 60);
          assert(game.player.position.equals(p), "automatic swim");
          assert(park.launchButton.hidden, "replay bypasses swim");
          swimOut();
        }
      },
    );
    check(
      "Pause freezes lift, slide, splash and swim; resume restores input",
      () => {
        const frozen = () => {
          game.pause();
          const before = [park.time, park.ride.liftTime, park.ride.distance, park.ride.dropTime, park.ride.swimTime, ...game.player.position.toArray()];
          frames(30);
          const after = [park.time, park.ride.liftTime, park.ride.distance, park.ride.dropTime, park.ride.swimTime, ...game.player.position.toArray()];
          assert(before.every((value, i) => value === after[i]), 'paused '+park.ride.state+' moved');
          game.resume();
        };
        park.board(0);
        assert(park.ride.state === 'lifting', 'lift did not start');
        frozen();
        advance(() => park.ride.state === 'seated');
        park.launch();
        frozen();
        advance(() => park.ride.state === 'dropping');
        frozen();
        advance(() => park.swimming);
        frozen();
        park.exit();
        enter(2);
        park.launch();
        advance(() => park.swimming);
        game.pause();
        const p = game.player.position.clone(),
          time = park.time;
        frames(30);
        assert(
          game.player.position.equals(p) && park.time === time,
          "paused swim moved",
        );
        game.resume();
        game.input.press("KeyW");
        frames(20);
        game.input.release("KeyW");
        assert(game.player.position.distanceTo(p) > 0.1, "resume stuck");
        park.exit();
        enter(0);
        park.launch();
        game.pause();
        const d = park.ride.distance;
        frames(20);
        assert(park.ride.distance === d, "paused slide moved");
        game.resume();
        park.exit();
      },
    );
    check(
      "Both cameras render the vertical drop, inversions, bowl and drain",
      () => {
        for (let i = 0; i < 3; i++) {
          enter(i);
          const track = park.track;
          for (const distance of [
            track.length * 0.15,
            track.length * 0.4,
            track.bowlStart ?? track.length * 0.6,
            track.bowlEnd ?? track.length * 0.9,
          ])
            for (const calm of [false, true])
              for (const view of ["front", "follow"]) {
                park.ride.distance = distance;
                park.view = view;
                game.calm = calm;
                park.placeTrain();
                park.updateCamera(1 / 60);
                park.applyEnvironment();
                assert(
                  game.camera.quaternion.toArray().every(Number.isFinite),
                  "camera invalid",
                );
                game.renderer.render(game.scene, game.camera);
                assert(
                  game.renderer.getContext().getError() === 0,
                  "WebGL error",
                );
              }
          park.exit();
        }
        game.calm = originalCalm;
        assert(
          park.group.getObjectByName("giant-open-whirlpool-bowl"),
          "missing open bowl",
        );
        assert(
          park.group.getObjectByName("swimmable-splash-lagoon"),
          "missing pool",
        );
      },
    );
    check(
      "All avatars swim, exit, reboard and restore when switching characters",
      () => {
        for (const avatar of game.characters.keys()) {
          game.pause();
          game.setCharacter(avatar);
          game.resume();
          enter(2);
          park.launch();
          advance(() => park.swimming);
          game.input.press("KeyW");
          park.update(0.1);
          game.input.release("KeyW");
          assert(game.player.model.visible, "invisible swimmer");
          park.exitButton.click();
          assert(!game.player.inVehicle, "rescue failed");
          enter(1);
          game.pause();
          game.setCharacter(original);
          assert(
            !park.occupied && !game.player.inVehicle,
            "character switch stranded rider",
          );
          game.resume();
        }
      },
    );
    check(
      "Water advances, swimming touch controls remain visible, and HUD fits",
      () => {
        enter(2);
        park.launch();
        advance(() => park.swimming);
        frames(2);
        const before = park.waterTexture.offset.x;
        park.animateWater(0.1);
        assert(before !== park.waterTexture.offset.x, "static water");
        const hud = park.hud.getBoundingClientRect();
        assert(
          hud.left >= 0 &&
            hud.right <= innerWidth + 1 &&
            hud.bottom <= innerHeight + 1,
          "HUD overflow",
        );
        if (innerWidth <= 700 || matchMedia("(pointer:coarse)").matches) {
          const controls = document.querySelector("#mobile-controls");
          assert(
            getComputedStyle(controls).display !== "none",
            "swim touch controls hidden",
          );
        }
        for (const button of park.hud.querySelectorAll("button"))
          if (!button.hidden)
            assert(
              button.getBoundingClientRect().height >= 44,
              "small touch target",
            );
        park.exit();
      },
    );
    check(
      "Changing areas restores the rider and water-park camera state",
      () => {
        enter(0);
        game.enter("cafe");
        assert(
          !park.occupied &&
            !game.player.inVehicle &&
            game.player.model.parent === game.scene,
          "area switch leaked ride",
        );
        game.enter("town");
      },
    );
    if (park.occupied) park.exit();
    game.calm = originalCalm;
    game.player.teleport(WATER_PARK_EXIT.x, WATER_PARK_EXIT.z + 4);
    game.follow.reset(0);
    frames(5);
    panel = document.createElement("section");
    panel.id = "water-park-test-results";
    panel.style.cssText =
      "position:absolute;top:100px;left:12px;right:12px;z-index:60;padding:14px;background:#30204ef0;color:white;max-height:60vh;overflow:auto;font:13px/1.5 system-ui";
    const title = document.createElement("strong");
    title.textContent = `${results.filter((r) => r.startsWith("PASS")).length}/${results.length} water park browser checks passed`;
    panel.append(title);
    results.forEach((result) => {
      const row = document.createElement("div");
      row.textContent = result;
      panel.append(row);
    });
    const inspect = (index, distance) => {
      enter(index);
      park.ride.distance = distance;
      park.placeTrain();
      park.updateHUD();
      park.applyEnvironment();
      game.setMode("paused");
    };
    show("Inspect full park", () => {
      game.setMode("paused");
      game.camera.position.set(35, 172, 12);
      game.camera.up.set(0, 1, 0);
      game.camera.lookAt(-166, 92, -196);
      game.camera.far = 900;
      game.camera.updateProjectionMatrix();
      game.renderer.render(game.scene, game.camera);
    });
    show("Inspect giant bowl", () => {
      inspect(2, park.tracks[2].bowlStart + 100);
      game.camera.position.set(-80, 83, -153);
      game.camera.up.set(0, 1, 0);
      game.camera.lookAt(-131, 25, -198);
      game.renderer.render(game.scene, game.camera);
    });
    show("Inspect plunge from the top", () => {
      inspect(0, 0);
      park.view = "follow";
      park.updateCamera(1 / 60);
      game.renderer.render(game.scene, game.camera);
    });
    show("Try swimming", () => {
      enter(2);
      park.launch();
      advance(() => park.swimming);
      game.input.clear();
      game.setMode("playing");
    });
    for (let i = 0; i < 3; i++)
      show(`Explore lift ${i + 1}`, () => {
        if (park.occupied) park.exit();
        game.setMode("playing");
        const e = WATER_SLIDES[i].entry;
        game.player.teleport(e.x, e.z + 3);
        game.follow.reset(0);
      });
    document.body.append(panel);
    const back = document.createElement("button");
    back.textContent = "Show water park checks";
    back.style.cssText =
      "position:absolute;right:12px;top:75px;z-index:100;padding:8px";
    back.onclick = () => (panel.hidden = !panel.hidden);
    document.body.append(back);
  };
}
