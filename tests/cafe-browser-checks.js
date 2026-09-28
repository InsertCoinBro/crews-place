import { SPACE_ALTITUDE } from "../shared/world/space.js";

export function runCafeChecks(game) {
  const results = [];
  const assert = (value, message) => {
    if (!value) throw new Error(message);
  };
  const check = (name, run) => {
    try {
      run();
      results.push("PASS · " + name);
    } catch (error) {
      results.push("FAIL · " + name + ": " + error.message);
      console.error(error);
    }
  };
  game.start();
  check("Town café door enters the black room", () => {
    const door = game.interactions.items.find(
      (item) => item.id === "cafe-door",
    );
    assert(door, "missing café door");
    game.interactions.handlers.get("door")(door);
    assert(game.area.id === "cafe", "wrong room");
    assert(game.scene.background.getHex() === 0, "background is not black");
    assert(
      game.skyLight.intensity === 0 &&
        game.sun.intensity === 0 &&
        game.scene.environmentIntensity === 0,
      "room lighting is still on",
    );
    assert(!game.areas.town.group.visible, "town still visible");
  });
  check("Portal renders and respects calm motion and pause", () => {
    const portal = game.area.group.getObjectByName("cafe-space-portal");
    const time = portal.material.uniforms.time;
    game.area.updatePortal(1, false);
    const normal = time.value;
    game.area.updatePortal(1, true);
    assert(time.value - normal === 0.25, "calm swirl not slowed");
    game.setMode("paused");
    const paused = time.value;
    game.tick(1 / 60);
    assert(time.value === paused, "portal animates during pause");
    game.setMode("playing");
    game.tick(1 / 60);
    game.renderer.render(game.scene, game.camera);
    assert(game.renderer.getContext().getError() === 0, "WebGL error");
  });
  check(
    "Walking into the portal arrives beside the spacecraft at Space altitude",
    () => {
      game.player.teleport(190, 0.8, 0);
      game.follow.reset(0);
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
      for (let i = 0; i < 30 && game.area.id === "cafe"; i++) game.tick(1 / 60);
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
      const destination = game.spaceship.boardingPoint;
      assert(game.area.id === "space", "walk-through failed");
      assert(
        game.player.position.y === SPACE_ALTITUDE,
        "wrong arrival altitude",
      );
      assert(
        Math.hypot(
          game.player.position.x - destination.x,
          game.player.position.z - destination.z,
        ) < 0.1,
        "not beside spacecraft",
      );
      assert(
        game.skyLight.intensity === 0.35 && game.sun.intensity === 1.1,
        "Space lighting not restored",
      );
      assert(!game.areas.cafe.group.visible, "café still visible");
      assert(
        game.interactions.find(game.player.position, "space")?.kind ===
          "spaceship",
        "spacecraft cannot be boarded",
      );
    },
  );
  check("Interact key activates portal without needing to walk through", () => {
    game.enter("cafe", [190, 2]);
    for (let i = 0; i < 60; i++) game.tick(1 / 60);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    game.tick(1 / 60);
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyE" }));
    assert(game.area.id === "space", "interact failed");
  });
  check("Café exit restores town and its lighting", () => {
    game.enter("cafe");
    const exit = game.interactions.items.find(
      (item) => item.id === "cafe-exit",
    );
    game.interactions.handlers.get("door")(exit);
    assert(game.area.id === "town", "exit failed");
    assert(
      game.skyLight.intensity === 2.2 &&
        game.sun.intensity === 3.2 &&
        game.scene.environmentIntensity === 1,
      "town lighting not restored",
    );
  });
  game.enter("cafe");
  game.tick(1 / 60);
  const panel = document.createElement("pre");
  panel.id = "cafe-test-results";
  panel.style.cssText =
    "position:absolute;left:16px;top:150px;z-index:30;padding:12px;background:#101820;color:white;font:12px/1.6 monospace";
  panel.textContent = `${results.filter((r) => r.startsWith("PASS")).length}/${results.length} café checks passed\n${results.join("\n")}`;
  document.querySelector("#game").append(panel);
}
