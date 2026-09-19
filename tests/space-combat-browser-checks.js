export function runSpaceCombatChecks(game) {
  const results = [];
  const assert = (x, msg) => {
    if (!x) throw Error(msg);
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
  game.start();
  game.enter("space", [-20, 0]);
  frames(2);
  check("Five visible independent Moon Mischief NPCs", () => {
    assert(game.spaceAlien.aliens.length === 5, "wrong count");
    assert(
      game.spaceAlien.aliens.every((a) => a.model.visible),
      "hidden alien",
    );
  });
  for (const id of ["cowboy", "jolly_robot", "moon_mischief"])
    check(`${id} equips, bubbles and floats an alien to the boundary`, () => {
      game.pause();
      game.setCharacter(id);
      game.resume();
      game.player.teleport(-20, 0, 180);
      game.player.heading = 0;
      frames(30);
      const c = game.spaceAlien,
        a = c.aliens[0];
      a.model.position.set(-20, 180, 8);
      a.delay = 10;
      a.respawn = 0;
      const before = c.defeated;
      game.input.press("KeyB");
      frames(1);
      game.input.release("KeyB");
      assert(c.gun.visible, "blaster missing");
      assert(c.beam.visible, "shot missing");
      assert(c.defeated === before + 1, "bubble shot did not capture target");
      assert(a.respawn > 0 && c.bubbles.has(a), "bubble did not start");
      frames(1000);
      assert(
        a.respawn === 0 && a.model.visible && !c.bubbles.has(a),
        "bubble did not leave the area and respawn",
      );
    });
  check("Paused chase and playground prevent firing", () => {
    const c = game.spaceAlien;
    document.querySelector("#alien-toggle").click();
    frames(1);
    assert(!c.enabled, "pause chase failed");
    game.input.press("KeyB");
    frames(1);
    game.input.release("KeyB");
    assert(!c.gun.visible, "gun remained enabled");
    document.querySelector("#alien-toggle").click();
    game.playground.enter("swing");
    frames(1);
    assert(!c.gun.visible, "gun visible on swing");
    game.playground.exit();
  });
  game.pause();
  game.setCharacter(original);
  game.resume();
  const panel = document.createElement("section");
  panel.id = "space-combat-test-results";
  panel.style.cssText =
    "position:fixed;inset:20px;z-index:90;padding:24px;overflow:auto;background:#102737;color:white";
  panel.innerHTML = `<h1>${results.filter((r) => r.startsWith("PASS")).length}/${results.length} space combat checks passed</h1><pre>${results.join("\n")}</pre>`;
  document.body.append(panel);
}
