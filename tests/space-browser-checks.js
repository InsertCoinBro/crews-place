import { SPACE_ALTITUDE, SPACE_BOUNDS } from "../shared/world/space.js";

// Browser integration harness: visit /?space-test during local development.
export function runSpaceChecks(game) {
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

  game.start();
  game.enter("space");

  check("Space loads as a separate elevated world", () => {
    assert(game.area.id === "space", "space area did not activate");
    assert(game.area.group.visible, "space layer is hidden");
    assert(!game.areas.town.group.visible, "town remained visible");
    assert(game.player.position.y === SPACE_ALTITUDE, "wrong space altitude");
  });

  check("Stars, planet, landing pad, and walkable ground render", () => {
    for (const name of [
      "space-star-field",
      "distant-blue-planet",
      "space-landing-pad",
      "walkable-space-ground",
    ])
      assert(game.area.group.getObjectByName(name), `missing ${name}`);
    game.renderer.render(game.scene, game.camera);
    assert(game.renderer.info.render.triangles > 100, "space has no geometry");
    assert(game.renderer.getContext().getError() === 0, "WebGL error");
  });

  check("The character can walk and jump on the space surface", () => {
    const beforeZ = game.player.position.z;
    key("KeyW");
    frames(75);
    key("KeyW", "keyup");
    assert(game.player.position.z < beforeZ - 2, "walking did not move");
    key("Space");
    frames(1);
    key("Space", "keyup");
    frames(180);
    assert(game.player.grounded, "character did not land");
    assert(game.player.position.y === SPACE_ALTITUDE, "landed below space");
  });

  check("Space edges keep the character safely on the platform", () => {
    game.player.teleport(SPACE_BOUNDS.maxX - 0.4, 0, SPACE_ALTITUDE);
    game.follow.reset(-Math.PI / 2);
    key("KeyW");
    frames(180);
    key("KeyW", "keyup");
    assert(
      game.player.position.x <= SPACE_BOUNDS.maxX - 0.36 + 0.001,
      "character crossed the space boundary",
    );
  });

  const panel = document.createElement("section");
  panel.id = "space-test-results";
  panel.style.cssText =
    "position:absolute;left:16px;top:185px;z-index:30;max-width:680px;padding:16px;border-radius:14px;background:#080d26ee;color:#e9efff;font:12px/1.55 monospace;border:2px solid #9ce7df";
  panel.innerHTML = `<h1>${results.filter((result) => result.startsWith("PASS")).length}/${results.length} space browser checks passed</h1><pre>${results.join("\n")}</pre>`;
  document.querySelector("#game").append(panel);
}
