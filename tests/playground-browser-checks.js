import { SPACE_ALTITUDE as Y } from "../shared/world/space.js";

export function runPlaygroundChecks(game) {
  const results = [];
  const startingAvatar = game.player.model.userData.avatarId;
  const assert = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const check = (name, fn) => {
    try {
      fn();
      results.push("PASS · " + name);
    } catch (e) {
      results.push("FAIL · " + name + ": " + e.message);
      console.error(e);
    }
  };
  const frames = (n) => {
    for (let i = 0; i < n; i++) game.tick(1 / 60);
  };
  const key = (code, type = "keydown") =>
    window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  const press = (code) => {
    key(code);
    frames(1);
    key(code, "keyup");
  };
  const board = (ride) => {
    const item = game.interactions.items.find(
      (i) => i.id === `playground-${ride}`,
    );
    game.player.teleport(item.x, item.z, Y);
    frames(35);
    assert(
      game.interactions.current?.id === item.id,
      "boarding prompt missing",
    );
    press("KeyE");
    assert(game.playground.active === ride, "E did not board");
  };
  game.start();
  game.enter("space");
  check("Moon swing boards and carries the visible character", () => {
    board("swing");
    const start = game.player.position.clone();
    frames(100);
    assert(game.player.position.distanceTo(start) > 0.5, "swing did not move");
    assert(game.player.model.visible, "rider is hidden");
    press("KeyE");
    assert(
      !game.playground.active && game.player.position.y === Y,
      "swing exit failed",
    );
  });
  check("Spinner rotates with the rider and exits safely", () => {
    board("spinner");
    const start = game.player.position.clone();
    frames(180);
    assert(
      game.player.position.distanceTo(start) > 0.5,
      "spinner did not move rider",
    );
    press("KeyE");
    assert(!game.playground.active, "spinner exit failed");
  });
  check("Giant slide lifts 22 metres, descends, and restores walking", () => {
    board("slide");
    frames(410);
    assert(game.player.position.y > Y + 20, "lift did not reach slide top");
    assert(
      game.camera.position.z < game.player.position.z,
      "slide camera is not looking downhill from behind",
    );
    frames(800);
    assert(!game.playground.active, "slide never finished");
    assert(
      game.player.position.y === Y && game.player.position.z === 56,
      "wrong slide landing",
    );
    const start = game.player.position.clone();
    key("KeyW");
    frames(20);
    key("KeyW", "keyup");
    assert(
      game.player.position.distanceTo(start) > 0.2,
      "walking not restored",
    );
  });
  check("Zero gravity allows ascent, drifting and bounded flight", () => {
    board("float");
    key("Space");
    key("KeyW");
    frames(360);
    key("Space", "keyup");
    key("KeyW", "keyup");
    assert(game.player.position.y > Y + 3, "cannot float upward");
    const p = game.player.position;
    assert(
      Math.hypot(p.x + 65, p.y - Y, p.z + 15) <= 8.51,
      "escaped zero gravity boundary",
    );
    const y = p.y;
    frames(120);
    assert(
      p.y >= Y + 1 && Math.abs(p.y - y) < 5,
      "ordinary gravity pulled player down",
    );
    key("KeyC");
    frames(180);
    key("KeyC", "keyup");
    assert(p.y < y, "cannot descend");
    press("KeyE");
    assert(!game.playground.active && p.y === Y, "zero gravity exit failed");
  });
  check("Gentler motion, repeated entry and early slide exit work", () => {
    game.calm = true;
    board("slide");
    frames(60);
    press("KeyE");
    assert(
      !game.playground.active && game.player.position.y === Y,
      "early exit failed",
    );
    board("swing");
    frames(60);
    assert(
      Math.abs(game.playground.swing.rotation.x) <= 0.25,
      "calm swing too large",
    );
    press("KeyE");
    game.calm = false;
  });
  check("Ride speed buttons and pause preserve player control", () => {
    board("spinner");
    const speed = game.playground.speed;
    document.querySelector("#playground-faster").click();
    assert(game.playground.speed > speed, "faster button failed");
    document.querySelector("#playground-slower").click();
    assert(
      Math.abs(game.playground.speed - speed) < 0.001,
      "slower button failed",
    );
    game.pause();
    const position = game.player.position.clone();
    frames(60);
    assert(
      position.distanceTo(game.player.position) === 0,
      "ride moved while paused",
    );
    game.resume();
    frames(60);
    assert(
      position.distanceTo(game.player.position) > 0.1,
      "ride did not resume",
    );
    document.querySelector("#playground-exit").click();
    assert(!game.playground.active, "exit button failed");
  });
  check("Jolly Robot can ride and exit with a valid seated pose", () => {
    game.pause();
    assert(game.setCharacter("jolly_robot"), "robot could not be selected");
    game.resume();
    board("swing");
    frames(120);
    game.player.model.traverse((node) => {
      assert(
        [
          node.quaternion.x,
          node.quaternion.y,
          node.quaternion.z,
          node.quaternion.w,
        ].every(Number.isFinite),
        `invalid robot pose on ${node.name}`,
      );
    });
    assert(game.player.model.visible, "robot rider is hidden");
    press("KeyE");
    assert(
      !game.playground.active && game.player.position.y === Y,
      "robot could not exit safely",
    );
    game.pause();
    game.setCharacter(startingAvatar);
    game.resume();
  });
  const panel = document.createElement("section");
  panel.id = "playground-test-results";
  panel.style.cssText =
    "position:fixed;inset:20px;z-index:80;background:#172338;color:white;padding:24px;overflow:auto";
  panel.innerHTML = `<h1>${results.filter((r) => r.startsWith("PASS")).length}/${results.length} playground checks passed</h1><pre>${results.join("\n")}</pre>`;
  document.body.append(panel);
}
