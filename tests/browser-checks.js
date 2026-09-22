import { overlapsCircle, PLAYER_RADIUS } from "../shared/core/physics.js";
import { NPC_ROUTES } from "../shared/world/npcs.js";
// Browser integration harness: visit /?test during local development.
// Sets up scenarios, then drives the real Input -> Game.tick -> renderer path.
export function runBrowserChecks(game) {
  const results = [];
  const assert = (ok, message) => {
    if (!ok) throw new Error(message);
  };
  const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const check = (name, fn) => {
    try {
      fn();
      results.push("PASS · " + name);
    } catch (e) {
      results.push("FAIL · " + name + ": " + e.message);
      console.error(name, e);
    }
  };
  const key = (code, type = "keydown") =>
    window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  const frames = (n) => {
    for (let i = 0; i < n; i++) game.tick(1 / 60);
  };
  const hold = (code, n) => {
    key(code);
    frames(n);
    key(code, "keyup");
  };
  const place = (x, z) => {
    game.input.clear();
    game.player.teleport(x, z);
    game.follow.reset(0);
  };
  game.setCharacter("cowboy");
  game.start();
  check(
    "Main player is the animated cowboy with face, outfit and ten clips",
    () => {
      assert(
        game.player.model.userData.avatarId === "cowboy",
        "wrong player asset",
      );
      const parts = new Set();
      game.player.model.traverse((n) => {
        if (n.isMesh && n.visible) parts.add(n.userData.avatarPart);
      });
      for (const part of [
        "head",
        "face",
        "shirt",
        "trousers",
        "boots",
        "hat",
        "gear",
      ])
        assert(parts.has(part), "missing cowboy part: " + part);
      assert(
        game.player.model.animations.length === 10,
        "cowboy animation clips missing",
      );
    },
  );
  check("Start button enters a rendered 3D town", () => {
    assert(game.mode === "playing", "not playing");
    game.renderer.render(game.scene, game.camera);
    assert(game.renderer.info.render.triangles > 100, "no scene geometry");
    assert(game.renderer.getContext().getError() === 0, "WebGL error");
  });
  check("WASD movement + smooth stopping", () => {
    place(0, 15);
    hold("KeyW", 60);
    const z = game.player.position.z;
    assert(z < 11, "W did not move");
    frames(60);
    assert(game.player.velocity.length() < 0.001, "did not stop");
  });
  check("Arrow keys move the player", () => {
    place(0, 15);
    hold("ArrowRight", 60);
    assert(game.player.position.x > 2, "arrow key did not move");
  });
  check("Back key walks backward without turning the camera", () => {
    place(0, 15);
    hold("KeyS", 90);
    assert(game.player.position.z > 21, "back key did not move backward");
    assert(Math.abs(game.follow.yaw) < 0.02, "back key turned the camera");
  });
  check("Held side movement keeps turning continuously", () => {
    place(0, 15);
    key("KeyA");
    frames(60);
    const middleYaw = game.follow.yaw;
    const middlePosition = game.player.position.clone();
    frames(60);
    key("KeyA", "keyup");
    assert(
      middleYaw > 2 && game.follow.yaw > middleYaw + 2,
      "held left input stopped turning before the key was released",
    );
    assert(
      game.player.position.distanceTo(middlePosition) > 3,
      "held left input stopped moving during the continued turn",
    );
  });
  check("Forward movement keeps turning while a side key is held", () => {
    place(0, 15);
    key("KeyW");
    key("KeyD");
    frames(30);
    assert(game.player.position.z < 15, "forward input stopped while turning");
    frames(90);
    key("KeyW", "keyup");
    key("KeyD", "keyup");
    assert(
      game.player.position.x > 0,
      "right input did not steer forward movement",
    );
    assert(game.follow.yaw < -2, "forward movement did not keep turning");
  });
  check("Building collisions prevent wall crossing", () => {
    place(-12, -5);
    hold("KeyW", 150);
    assert(game.player.position.z >= -7.65, "entered arcade wall");
    assert(game.player.position.z < -7.3, "did not approach wall");
  });
  check("Expanded ground is walkable and the new map edge is bounded", () => {
    place(0, 28.5);
    hold("KeyS", 120);
    assert(game.player.position.z > 32, "old town edge still blocks movement");
    place(0, game.area.bounds.maxZ - 0.5);
    hold("KeyS", 180);
    assert(
      game.player.position.z <= game.area.bounds.maxZ - PLAYER_RADIUS + 0.001,
      "escaped expanded map",
    );
    assert(game.player.position.y === 0, "fell through ground");
  });
  check("Animated horse explores the outer meadow", () => {
    assert(game.wildlife.horse, "horse did not load");
    const before = game.wildlife.horse.model.position.clone();
    place(0, 15);
    frames(120);
    assert(
      game.wildlife.horse.model.position.distanceTo(before) > 0.5,
      "horse did not walk",
    );
    assert(
      game.wildlife.horse.model.userData.animationState === "Walk",
      "horse walk animation is not active",
    );
  });
  check("Jump returns to ground", () => {
    place(0, 10);
    key("Space");
    frames(24);
    key("Space", "keyup");
    assert(game.player.position.y > 0.5, "no jump");
    frames(120);
    assert(game.player.grounded && game.player.position.y === 0, "no landing");
  });
  check("Trampoline bounces on a descending landing", () => {
    place(11, 6);
    key("Space");
    frames(1);
    key("Space", "keyup");
    let peak = 0;
    for (let i = 0; i < 180; i++) {
      frames(1);
      peak = Math.max(peak, game.player.position.y);
    }
    assert(peak > 4.5, "trampoline did not bounce");
  });
  check("Leaf pile emits moving leaves on landing", () => {
    place(4, 10);
    game.leaves.cooldown = 0;
    game.leaves.inside = false;
    key("Space");
    frames(1);
    key("Space", "keyup");
    frames(60);
    assert(
      game.leaves.particles.some(
        (p) => p.life > 0 && p.mesh.position.y > p.home.y + 0.1,
      ),
      "no airborne leaves",
    );
  });
  for (const [id, x] of [
    ["arcade", -12],
    ["library", 0],
    ["rec", 12],
  ]) {
    const origin = id === "arcade" ? 100 : id === "library" ? 130 : 160;
    check("Enter " + id + " using E", () => {
      game.enter("town");
      place(x, -6.5);
      frames(1);
      assert(game.interactions.current?.target === id, "door prompt missing");
      hold("KeyE", 1);
      assert(game.area.id === id, "transition failed");
      assert(game.area.group.visible, "room invisible");
    });
    check(id + " activity isolates town movement", () => {
      place(
        id === "arcade" ? origin : id === "library" ? origin - 3.1 : origin - 3,
        id === "arcade" ? -1.9 : id === "library" ? -4.1 : 0,
      );
      frames(1);
      hold("KeyE", 1);
      assert(
        id === "arcade"
          ? game.mode === "arcade" && game.arcade.current?.id === "memory"
          : id === "library"
            ? game.mode === "reading" && !game.library.root.hidden
            : game.mode === "activity" && game.ui.panel.open,
        "activity absent",
      );
      const p = game.player.position.clone();
      hold("KeyW", 45);
      assert(
        game.player.position.distanceTo(p) === 0,
        "controls active under panel",
      );
      if (id === "arcade") game.arcade.exit();
      else if (id === "library") game.library.close();
      else game.resume();
      frames(24);
      assert(game.mode === "playing", "resume failed");
    });
    check("Exit " + id + " using E", () => {
      place(origin, 4.8);
      frames(1);
      hold("KeyE", 1);
      assert(game.area.id === "town", "exit failed");
    });
  }
  check("Park destination panel and Escape", () => {
    place(15.5, 12.4);
    frames(1);
    hold("KeyE", 1);
    assert(game.ui.panel.open, "park panel absent");
    game.ui.panel.dispatchEvent(new Event("cancel", { cancelable: true }));
    assert(!game.ui.panel.open && game.mode === "playing", "cancel failed");
  });
  check("Camera rotation and wall avoidance", () => {
    place(-12, -6.9);
    game.input.lookX = 280;
    frames(1);
    assert(game.follow.yaw < -0.5, "mouse delta ignored");
    game.follow.reset(Math.PI);
    frames(1);
    assert(game.camera.position.z > -8, "camera entered building");
  });
  check("Interior exit door does not obstruct the camera", () => {
    game.enter("arcade");
    place(100, 3);
    frames(1);
    assert(game.camera.position.z < 5.85, "camera passed through exit door");
    game.enter("town");
  });
  check("Traffic and NPCs move around their routes", () => {
    const car = game.traffic.cars[0].model.position.clone(),
      person = game.npcs.people[0].model.position.clone();
    place(0, 15);
    frames(120);
    assert(
      car.distanceTo(game.traffic.cars[0].model.position) > 2,
      "traffic stopped",
    );
    assert(
      person.distanceTo(game.npcs.people[0].model.position) > 0.5,
      "NPC stopped",
    );
  });
  check(
    "Player car enters, drives the loop, and stays where it is parked",
    () => {
      game.enter("town");
      place(game.vehicle.model.position.x, game.vehicle.model.position.z + 2.8);
      frames(1);
      assert(
        game.interactions.current?.id === "player-car",
        "car prompt missing",
      );
      hold("KeyE", 1);
      assert(game.driving, "did not enter player car");
      assert(!game.player.model.visible, "player should be inside the car");
      frames(45);
      assert(
        Math.abs(angleDelta(game.follow.yaw, game.vehicle.cameraYaw())) < 0.06,
        "camera did not move behind the car",
      );
      const before = game.vehicle.distance;
      hold("KeyW", 60);
      assert(game.vehicle.distance > before, "car did not drive forward");
      hold("KeyE", 1);
      const parked = game.vehicle.distance;
      assert(!game.driving, "did not exit player car");
      assert(
        game.player.model.visible,
        "player should be visible after exiting",
      );
      frames(20);
      assert(game.vehicle.distance === parked, "car did not remain parked");
    },
  );
  check("Walking routes clear town furniture and trunks", () => {
    for (const route of NPC_ROUTES)
      for (let d = 0; d < route.length; d += 0.2) {
        const p = route.sample(d);
        assert(
          !game.areas.town.colliders.some((b) =>
            overlapsCircle(p.x, p.z, 0.32, b),
          ),
          `route hits scenery at ${p.x}, ${p.z}`,
        );
      }
  });
  check("Pause clears held controls and resumes", () => {
    key("KeyW");
    game.pause();
    const p = game.player.position.clone();
    frames(30);
    assert(game.player.position.equals(p), "moved while paused");
    game.resume();
    frames(30);
    assert(game.input.keys.size === 0, "stuck key after pause");
    key("KeyW", "keyup");
  });
  check("Shift running and F dance toggle use the animated cowboy", () => {
    game.enter("town");
    place(0, 15);
    key("ShiftLeft");
    hold("KeyW", 25);
    key("ShiftLeft", "keyup");
    assert(game.player.model.animator.current === "Run", "run clip missing");
    frames(70);
    hold("KeyF", 2);
    assert(game.player.model.animator.current === "Dance", "dance missing");
    frames(260);
    assert(
      game.player.model.animator.current === "Dance",
      "dance did not loop",
    );
    hold("KeyF", 2);
    assert(game.player.model.animator.current === "Idle", "dance did not stop");
  });
  check("T reaches, holds and returns a real toy", () => {
    place(-2.4, 15.45);
    hold("KeyT", 65);
    assert(game.pickups.held, "toy did not attach to hand");
    assert(
      game.pickups.held.item.mesh.parent.name === "DEF-handR",
      "toy is not held by wrist",
    );
    hold("KeyT", 65);
    assert(!game.pickups.held, "toy did not return");
  });
  game.enter("town");
  place(0, 15);
  game.follow.reset();
  frames(1);
  game.renderer.render(game.scene, game.camera);
  const report = document.createElement("details");
  report.id = "test-report";
  report.open = true;
  report.style.cssText =
    "position:absolute;top:180px;left:15px;z-index:20;background:#f8fff4f5;padding:15px;border:2px solid #305e51;border-radius:14px;font:12px/1.6 monospace;max-height:60vh;overflow:auto;max-width:90%;color:#194e4b";
  const summary = document.createElement("summary");
  summary.textContent =
    results.filter((r) => r.startsWith("PASS")).length +
    "/" +
    results.length +
    " browser integration checks passed";
  report.append(summary);
  const pre = document.createElement("div");
  for (const result of results) {
    const row = document.createElement("div");
    row.textContent = result;
    report.append(row);
  }
  const scenarios = {
    "Holding a toy": () => {
      game.enter("town");
      place(-2.4, 15.45);
      hold("KeyT", 65);
      game.setMode("character-preview");
      game.camera.position.set(-0.1, 1.7, 12.9);
      game.camera.lookAt(-2.4, 1, 15.45);
    },
    Town: () => {
      game.enter("town");
      place(0, 15);
    },
    "Open countryside": () => {
      game.enter("town");
      place(42, 42);
    },
    "Countryside edge": () => {
      game.enter("town");
      place(0, 84);
      game.follow.reset(Math.PI);
    },
    "Horse meadow": () => {
      game.enter("town");
      const horse = game.wildlife.horse?.model.position;
      place(horse?.x ?? -60, (horse?.z ?? 40) + 5);
    },
    "Arcade interior": () => {
      game.enter("arcade");
      place(100, 1.8);
    },
    "Club interior": () => {
      game.enter("rec");
      place(160, 1.8);
    },
    "Library interior": () => {
      game.enter("library");
      place(130, 1.8);
    },
    "Library reader": () => {
      game.enter("library");
      place(126.9, -4.1);
      frames(1);
      hold("KeyE", 1);
    },
    Leaves: () => {
      game.enter("town");
      place(4, 12);
    },
    Trampoline: () => {
      game.enter("town");
      place(11, 8);
    },
    "Player car": () => {
      game.enter("town");
      place(game.vehicle.model.position.x, game.vehicle.model.position.z + 2.8);
    },
    "Arcade door": () => {
      game.enter("town");
      place(-12, -6.5);
    },
    "Library door": () => {
      game.enter("town");
      place(0, -6.5);
    },
    "Activity panel": () => game.openDestination("park"),
  };
  for (const [name, fn] of Object.entries(scenarios)) {
    const button = document.createElement("button");
    button.textContent = name;
    button.style.cssText = "margin:4px;padding:6px";
    button.onclick = () => {
      if (game.ui.panel.open) game.resume();
      fn();
      game.canvas.focus();
      report.open = false;
    };
    pre.append(button);
  }
  report.append(pre);
  document.body.append(report);
  console.info(results.join("\n"));
}
