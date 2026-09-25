import {
  BUBBLE_ARENA_START,
  BUBBLE_ARENA_EXIT,
  insideBubbleArena,
} from "../shared/world/bubble-arena.js";

export function runSpaceCombatChecks(game) {
  const results = [];
  const assert = (ok, msg) => {
    if (!ok) throw Error(msg);
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
  const original = game.player.model.userData.avatarId;
  const c = game.spaceAlien;
  const enter = () => {
    c.enabled = true;
    c.reset();
    game.player.teleport(250, -225, game.area.groundY);
    game.player.heading = 0;
    game.follow.reset(0);
    frames(2);
  };
  game.start();
  game.enter("space", [BUBBLE_ARENA_EXIT.x, BUBBLE_ARENA_EXIT.z]);
  frames(2);
  check("Outside the arena: no gun, no controls, no pursuit", () => {
    assert(
      !c.canPlay() && !c.gun.visible && c.hud.hidden,
      "arena leaked into the moon",
    );
    const before = c.aliens.map((a) => a.model.position.clone());
    frames(120);
    assert(
      c.aliens.every((a, i) => a.model.position.equals(before[i])),
      "aliens chased outside",
    );
    assert(
      c.aliens.every((a) => insideBubbleArena(a.model.position, 2)),
      "alien outside square",
    );
  });
  check("Walking through the gate equips the gun; walking out removes it", () => {
    game.follow.reset(0);
    game.input.press("KeyW");
    frames(360);
    game.input.release("KeyW");
    assert(c.canPlay() && !c.hud.hidden && c.gun.visible, "entrance could not be crossed on foot");
    game.input.press("KeyS");
    frames(360);
    game.input.release("KeyS");
    frames(2);
    assert(!c.canPlay() && c.hud.hidden && !c.gun.visible, "walking out kept arena enabled");
  });
  for (const id of ["cowboy", "jolly_robot", "moon_mischief"])
    check(
      `${id}: entering equips bubbles; captured aliens float and respawn inside`,
      () => {
        game.pause();
        game.setCharacter(id);
        game.resume();
        enter();
        assert(!c.hud.hidden && c.gun.visible, "entry did not enable launcher");
        const a = c.aliens[0];
        a.model.position.set(250, 180, -217);
        a.delay = 20;
        const count = c.defeated;
        game.input.press("KeyB");
        frames(1);
        game.input.release("KeyB");
        assert(
          c.defeated === count + 1 && c.bubbles.has(a) && c.beam.visible,
          "bubble shot failed",
        );
        for (let i = 0; i < 450; i++) {
          frames(1);
          assert(
            insideBubbleArena(a.model.position, 1.5),
            "bubble left square",
          );
        }
        assert(a.respawn === 0 && !c.bubbles.has(a), "alien did not respawn");
      },
    );
  check("Moon rock cover blocks shots", () => {
    enter();
    game.player.teleport(215, -250, 180);
    game.player.heading = 0;
    frames(1);
    const a = c.aliens[0];
    a.model.position.set(215, 180, -230);
    a.delay = 20;
    const count = c.defeated;
    game.input.press("KeyB");
    frames(1);
    game.input.release("KeyB");
    assert(
      c.defeated === count && !c.bubbles.has(a),
      "shot passed through moon cover",
    );
  });
  check(
    "Warning grows, pause freezes it, crowding returns the player to the safe circle",
    () => {
      enter();
      c.grace = 0;
      const a = c.aliens[0];
      a.model.position.set(251, 180, -225);
      a.delay = 0;
      frames(75);
      assert(c.crowdTime > 1 && c.pressure.value > 20, "warning meter missing");
      const before = c.crowdTime;
      game.pause();
      frames(60);
      assert(c.crowdTime === before, "pause advanced warning");
      game.resume();
      const count = c.resetCount;
      frames(130);
      assert(c.resetCount === count + 1, "player did not reset");
      assert(
        Math.hypot(
          game.player.position.x - BUBBLE_ARENA_START.x,
          game.player.position.z - BUBBLE_ARENA_START.z,
        ) < 0.1,
        "wrong reset position",
      );
      frames(300);
      assert(c.resetCount === count + 1, "safe circle allowed repeated resets");
    },
  );
  check("Pause chase and Leave arena controls work", () => {
    enter();
    document.querySelector("#alien-toggle").click();
    frames(2);
    assert(!c.enabled && !c.gun.visible, "chase toggle failed");
    document.querySelector("#alien-toggle").click();
    frames(1);
    document.querySelector("#alien-exit").click();
    frames(2);
    assert(
      !c.canPlay() && c.hud.hidden && !c.gun.visible,
      "leave did not disable game",
    );
    assert(!insideBubbleArena(game.player.position), "leave stayed inside");
  });
  game.pause();
  game.setCharacter(original);
  game.resume();
  game.enter("space", [BUBBLE_ARENA_EXIT.x, BUBBLE_ARENA_EXIT.z]);
  game.player.heading = Math.PI;
  game.follow.reset(0);
  frames(2);
  const panel = document.createElement("section");
  panel.id = "space-combat-test-results";
  panel.style.cssText =
    "position:fixed;inset:20px;z-index:90;padding:24px;overflow:auto;background:#102737;color:white";
  const heading = document.createElement("h1");
  heading.textContent = `${results.filter((r) => r.startsWith("PASS")).length}/${results.length} Bubble Basin checks passed`;
  const report = document.createElement("pre");
  report.textContent = results.join("\n");
  report.style.whiteSpace = "pre-wrap";
  const button = document.createElement("button");
  button.textContent = "Explore Bubble Basin";
  button.style.cssText = "min-height:48px;padding:12px 24px";
  button.onclick = () => {
    game.player.teleport(BUBBLE_ARENA_START.x, BUBBLE_ARENA_START.z, game.area.groundY);
    game.player.heading = Math.PI;
    game.follow.reset(0);
    panel.remove();
    game.canvas.focus();
  };
  panel.append(heading, report, button);
  document.body.append(panel);
}
