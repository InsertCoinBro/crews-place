// Development-only integration and animation review: /?robot-test
export function runRobotChecks(game) {
  const results = [];
  const assert = (value, message) => {
    if (!value) throw new Error(message);
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
  const frames = (count) => {
    for (let i = 0; i < count; i++) game.tick(1 / 60);
  };
  const key = (code, type = "keydown") =>
    window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  const select = (id) => {
    if (game.mode === "playing") game.pause();
    const el = document.querySelector("#pause-character");
    el.value = id;
    el.dispatchEvent(new Event("change"));
    if (game.mode === "paused") game.resume();
    else game.start();
  };
  check("Robot can be selected without removing the cowboy", () => {
    select("jolly_robot");
    assert(
      game.player.model.userData.avatarId === "jolly_robot",
      "robot missing",
    );
    assert(game.characters.has("cowboy"), "cowboy missing");
    assert(game.player.model.animations.length === 11, "not all eleven clips");
  });
  check("Walk and Shift run use the real input path", () => {
    game.player.teleport(0, 18);
    game.follow.reset(0);
    game.canvas.focus();
    key("KeyW");
    frames(24);
    assert(game.player.model.animator.current === "Walk", "walk missing");
    key("ShiftLeft");
    frames(24);
    assert(game.player.model.animator.current === "Run", "run missing");
    key("ShiftLeft", "keyup");
    key("KeyW", "keyup");
    frames(60);
  });
  check("Jump, fall and land respond to physics", () => {
    key("Space");
    frames(1);
    key("Space", "keyup");
    assert(game.player.model.animator.current === "Jump", "jump missing");
    frames(26);
    assert(game.player.model.animator.current === "Fall", "fall missing");
    frames(40);
    assert(game.player.grounded, "did not land");
  });
  for (const [code, name] of [
    ["KeyF", "Wave"],
    ["KeyG", "Celebrate"],
    ["KeyH", "LookAround"],
    ["KeyJ", "Nod"],
    ["KeyK", "ShakeHead"],
  ]) {
    check(name + " keyboard gesture", () => {
      key(code);
      frames(2);
      key(code, "keyup");
      assert(game.player.model.animator.current === name, "gesture missing");
      frames(260);
    });
  }
  check(
    "Pause freezes animation and character switching preserves position",
    () => {
      const p = game.player.position.clone();
      game.pause();
      const t = game.player.model.animator.mixer.time;
      frames(30);
      assert(
        game.player.model.animator.mixer.time === t,
        "animation advances while paused",
      );
      select("cowboy");
      assert(game.player.position.equals(p), "position changed");
      select("jolly_robot");
      assert(game.player.position.equals(p), "robot position changed");
    },
  );
  check("Robot survives an arcade clone and returns to town", () => {
    game.enter("arcade");
    game.arcade.launch({ id: "test-memory", game: "memory" });
    assert(game.arcade.current?.id === "memory", "memory game did not start");
    frames(10);
    game.arcade.exit();
    game.enter("town");
    assert(game.player.model.userData.avatarId === "jolly_robot", "lost robot");
  });
  check("Rendered robot has no WebGL error", () => {
    game.player.teleport(0, 15);
    game.player.heading = 0;
    game.player.sync();
    game.follow.reset(0);
    frames(2);
    game.renderer.render(game.scene, game.camera);
    assert(game.renderer.getContext().getError() === 0, "WebGL error");
  });
  const report = document.createElement("details");
  report.id = "robot-test-report";
  report.open = true;
  report.style.cssText =
    "position:absolute;top:175px;right:18px;z-index:30;background:#f8fff4f5;padding:16px;border:2px solid #305e51;border-radius:14px;font:12px/1.5 monospace;max-height:55vh;overflow:auto;max-width:430px;color:#194e4b";
  const summary = document.createElement("summary");
  summary.textContent = `${results.filter((r) => r.startsWith("PASS")).length}/${results.length} robot integration checks passed`;
  report.append(summary);
  for (const result of results) {
    const row = document.createElement("div");
    row.textContent = result;
    report.append(row);
  }
  const gallery = document.createElement("div");
  gallery.style.marginTop = "12px";
  for (const name of [
    "Idle",
    "Walk",
    "Run",
    "Jump",
    "Fall",
    "Land",
    "Wave",
    "Celebrate",
    "LookAround",
    "Nod",
    "ShakeHead",
  ]) {
    const button = document.createElement("button");
    button.textContent = "Preview " + name;
    button.style.cssText = "padding:7px;margin:3px";
    button.onclick = () => {
      game.setMode("robot-preview");
      game.player.teleport(0, 15);
      game.player.heading = 0;
      game.player.sync();
      const p = game.player.position;
      game.camera.position.set(p.x + 2.1, p.y + 1.8, p.z + 3.6);
      game.camera.lookAt(p.x, p.y + 1, p.z);
      const animator = game.player.model.animator;
      animator.mixer.stopAllAction();
      animator.current = null;
      animator.play(name, 0);
      let last = performance.now();
      const play = (now) => {
        if (game.mode !== "robot-preview" || animator.current !== name) return;
        animator.mixer.update(Math.min((now - last) / 1000, 0.05));
        last = now;
        requestAnimationFrame(play);
      };
      requestAnimationFrame(play);
      report.open = false;
    };
    gallery.append(button);
  }
  const resume = document.createElement("button");
  resume.textContent = "Return to gameplay";
  resume.style.cssText = "padding:7px;margin:3px";
  resume.onclick = () => {
    game.setMode("playing");
    game.follow.reset();
    game.canvas.focus();
  };
  gallery.append(resume);
  report.append(gallery);
  document.body.append(report);
  console.info(results.join("\n"));
}
