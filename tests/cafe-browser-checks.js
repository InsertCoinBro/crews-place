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
  check("Town café door enters the alien portal chamber", () => {
    const door = game.interactions.items.find(
      (item) => item.id === "cafe-door",
    );
    assert(door, "missing café door");
    game.interactions.handlers.get("door")(door);
    assert(game.area.id === "cafe", "wrong room");
    assert(
      game.scene.background.getHex() === 0x0a0618,
      "background is not alien indigo",
    );
    assert(
      game.sun.intensity === 0 && game.scene.environmentIntensity === 0.25,
      "room lighting is wrong",
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
      const portal = game.areas.cafe.group.getObjectByName("cafe-space-portal");
      game.player.teleport(portal.position.x, portal.position.z + 0.8, 0);
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
    const portal = game.areas.cafe.group.getObjectByName("cafe-space-portal");
    game.enter("cafe", [portal.position.x, portal.position.z + 2]);
    for (let i = 0; i < 60; i++) game.tick(1 / 60);
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
    game.tick(1 / 60);
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyE" }));
    assert(game.area.id === "space", "interact failed");
  });
  check(
    "Space portal stays at the dock and returns on foot without bouncing back",
    () => {
      const portal =
        game.areas.space.group.getObjectByName("space-cafe-portal");
      assert(portal, "return portal missing");
      game.enter("space", [portal.position.x, portal.position.z + 0.8]);
      game.follow.reset(0);
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
      for (let i = 0; i < 30 && game.area.id === "space"; i++)
        game.tick(1 / 60);
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
      assert(game.area.id === "cafe", "return walk-through failed");
      for (let i = 0; i < 90; i++) game.tick(1 / 60);
      assert(game.area.id === "cafe", "arrival bounced back to Space");
      assert(game.player.position.y === 0, "café arrival altitude wrong");
      assert(
        game.sun.intensity === 0 && game.skyLight.intensity === 0.1,
        "café lighting not alien",
      );
      assert(
        game.areas.space.group.getObjectByName("space-cafe-portal") === portal,
        "portal disappeared",
      );
    },
  );
  check("Space portal supports interact and repeated round trips", () => {
    const portal = game.areas.space.group.getObjectByName("space-cafe-portal");
    for (let trip = 0; trip < 2; trip++) {
      game.enterCafePortal();
      for (let i = 0; i < 60; i++) game.tick(1 / 60);
      assert(game.area.id === "space", "Space arrival bounced back");
      game.player.teleport(
        portal.position.x,
        portal.position.z + 2,
        SPACE_ALTITUDE,
      );
      window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE" }));
      game.tick(1 / 60);
      window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyE" }));
      assert(game.area.id === "cafe", "return interaction failed");
    }
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
