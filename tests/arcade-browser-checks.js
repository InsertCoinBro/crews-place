import * as THREE from "three";
import { MEMORY_SETTINGS } from "../games/memory-hop/state.js";
// Development-only integration runner. Tests use real input/ticks and explicitly
// arrange contacts to cover the full 100-pop / 500-diamond completion paths.
export function runArcadeChecks(game) {
  const results = [];
  const assert = (v, m) => {
    if (!v) throw new Error(m);
  };
  const check = (name, fn) => {
    try {
      fn();
      results.push("PASS · " + name);
    } catch (e) {
      results.push("FAIL · " + name + ": " + e.message);
      console.error(name, e);
      if (game.arcade.current) game.arcade.exit();
    }
  };
  const key = (code, type = "keydown", repeat = false) =>
    window.dispatchEvent(
      new KeyboardEvent(type, { code, bubbles: true, repeat }),
    );
  const frames = (n) => {
    for (let i = 0; i < n; i++) game.tick(1 / 60);
  };
  const render = () => {
    const m = game.arcade.current;
    game.renderer.render(m?.scene ?? game.scene, m?.camera ?? game.camera);
  };
  const cabinetX = { bubble: 96.4, memory: 100, rocket: 103.6 };
  const launch = (id) => {
    if (game.arcade.current) game.arcade.exit();
    if (game.ui.panel.open) game.resume();
    game.enter("arcade");
    game.player.teleport(cabinetX[id], -2.15);
    game.interactionCooldown = 0;
    game.input.clear();
    frames(1);
    key("KeyE");
    frames(1);
    key("KeyE", "keyup");
    assert(game.arcade.current?.id === id, "cabinet entry failed");
    render();
    return game.arcade.current;
  };
  const click = (text) => {
    const b = [
      ...document.querySelectorAll("#arcade-result-actions button"),
    ].find((b) => b.textContent === text);
    assert(b, "button missing: " + text);
    b.click();
  };
  game.start();
  check("All three named cabinets launch with E and render", () => {
    for (const id of ["bubble", "memory", "rocket"]) {
      const m = launch(id);
      assert(
        game.mode === "arcade" && !game.input.enabled,
        "town controls not isolated",
      );
      assert(game.renderer.info.render.triangles > 10, "no mini-game geometry");
      assert(game.renderer.getContext().getError() === 0, "WebGL error");
      const avatar = m.avatar ?? m.cockpitAvatar;
      assert(
        avatar?.userData.avatarId === "cowboy",
        "cowboy missing from " + id,
      );
      const visibleParts = new Set();
      avatar.traverse((n) => {
        if (n.isMesh && n.visible) visibleParts.add(n.userData.avatarPart);
      });
      for (const part of ["head", "face", "hat"])
        assert(
          visibleParts.has(part),
          "invisible cowboy " + part + " in " + id,
        );
      game.arcade.exit();
    }
  });
  check(
    "Entry saves appearance, position and follow-camera state; exit restores them",
    () => {
      const original = game.player.model.toJSON();
      const m = launch("bubble"),
        snapshot = game.arcade.snapshot;
      key("KeyD");
      frames(20);
      key("KeyD", "keyup");
      game.arcade.exit();
      assert(
        game.player.position.equals(snapshot.position),
        "position changed",
      );
      assert(
        game.follow.yaw === snapshot.yaw &&
          game.follow.pitch === snapshot.pitch,
        "camera angles changed",
      );
      assert(
        game.camera.position.equals(snapshot.cameraPosition),
        "camera position changed",
      );
      assert(
        game.player.model.children.length === original.object.children.length,
        "equipment leaked",
      );
      assert(
        !game.player.model.getObjectByName("bubble-equipment"),
        "temporary equipment remained",
      );
    },
  );
  check("Held E cannot reopen a mini-game after exit", () => {
    launch("bubble");
    key("KeyE");
    document.querySelector("#arcade-exit").click();
    frames(30);
    key("KeyE", "keydown", true);
    frames(1);
    assert(!game.arcade.current, "repeat E reopened game");
    key("KeyE", "keyup");
    key("KeyE");
    frames(1);
    key("KeyE", "keyup");
    assert(game.arcade.current?.id === "bubble", "fresh E did not reopen");
    game.arcade.exit();
  });
  check(
    "Bubble flight steers, remains bounded, and keeps its character visible",
    () => {
      const m = launch("bubble"),
        x = m.avatar.position.x;
      key("KeyD");
      key("KeyW");
      frames(150);
      key("KeyD", "keyup");
      key("KeyW", "keyup");
      assert(m.avatar.visible && m.avatar.position.x > x, "flight failed");
      assert(
        m.avatar.position.y <= 8 && m.avatar.position.x <= m.limitX,
        "flight left bounds",
      );
      game.arcade.exit();
    },
  );
  check("Bubble collisions pop once and refill reachable bubbles", () => {
    const m = launch("bubble"),
      b = m.spawn(0, true),
      before = m.round.count;
    frames(1);
    assert(m.round.count === before + 1, "bubble contact not scored");
    m.pop(b);
    assert(m.round.count === before + 1, "duplicate pop");
    frames(80);
    assert(
      m.bubbles.some((b) => b.model.position.z < -20),
      "bubbles did not respawn",
    );
    game.arcade.exit();
  });
  check(
    "100 bubble pops celebrate and automatically restore the arcade",
    () => {
      const m = launch("bubble");
      for (let i = 0; i < 105 && m.round.phase === "playing"; i++) {
        m.spawn(0, true);
        frames(1);
      }
      assert(
        m.round.count === 100 && game.arcade.hud.resultVisible,
        "completion absent",
      );
      frames(180);
      assert(
        !game.arcade.current && game.area.id === "arcade",
        "automatic return failed",
      );
      assert(game.arcade.audio.voices.size === 0, "audio remained on exit");
    },
  );
  check("Memory board has 24 tiles, 12 pairs and a six-second preview", () => {
    const m = launch("memory");
    assert(
      m.cards.length === 24 &&
        new Set(m.round.tiles.map((t) => t.pair)).size === 12,
      "wrong board",
    );
    frames(300);
    assert(m.round.phase === "preview", "preview too short");
    frames(62);
    assert(m.round.phase === "playing", "preview failed to end");
    game.arcade.exit();
  });
  check(
    "Memory quick taps still hop; leaving cancels dwell and crossing doesn't reveal",
    () => {
      const m = launch("memory");
      frames(361);
      frames(30);
      key("ArrowRight");
      key("ArrowRight", "keyup");
      frames(17);
      assert(m.round.current === 1, "quick tap was lost between frames");
      assert(!m.round.tiles[0].revealed, "departed tile revealed");
      assert(!m.round.tiles[1].revealed, "pass-over activated");
      frames(50);
      assert(m.round.tiles[1].revealed, "stationary tile not revealed");
      game.arcade.exit();
    },
  );
  const hopTo = (m, index) => {
    let guard = 0;
    while (m.round.current !== index && guard++ < 20) {
      const col = m.round.current % 6,
        row = Math.floor(m.round.current / 6),
        tc = index % 6,
        tr = Math.floor(index / 6),
        code =
          col !== tc
            ? tc > col
              ? "ArrowRight"
              : "ArrowLeft"
            : tr > row
              ? "ArrowDown"
              : "ArrowUp";
      key(code);
      frames(17);
      key(code, "keyup");
    }
    assert(m.round.current === index, "could not navigate");
  };
  check("Memory mismatches close and do not reactivate underfoot", () => {
    const m = launch("memory");
    frames(361);
    frames(50);
    const other = m.round.tiles.findIndex(
      (t) => t.pair !== m.round.tiles[0].pair,
    );
    hopTo(m, other);
    frames(50);
    assert(m.round.phase === "mismatch", "mismatch missing");
    frames(80);
    assert(!m.round.tiles[other].revealed, "mismatch stayed open");
    frames(80);
    assert(!m.round.tiles[other].revealed, "same tile reactivated");
    game.arcade.exit();
  });
  check(
    "Memory can finish all 12 pairs with real hops and start a shuffled new round",
    () => {
      const m = launch("memory");
      frames(361);
      const ids = [...new Set(m.round.tiles.map((t) => t.pair))];
      for (const id of ids) {
        const indices = m.round.tiles
          .map((t, i) => (t.pair === id ? i : -1))
          .filter((i) => i >= 0);
        hopTo(m, indices[0]);
        frames(50);
        hopTo(m, indices[1]);
        frames(50);
      }
      assert(
        m.round.pairs === 12 && m.round.phase === "complete",
        "not all pairs solved",
      );
      const old = m.round.tiles.map((t) => t.pair).join();
      click("Play Another Round");
      assert(
        m.round.phase === "preview" && m.round.pairs === 0,
        "round did not reset",
      );
      assert(
        m.round.tiles.map((t) => t.pair).join() !== old,
        "board didn't shuffle",
      );
      game.arcade.exit();
    },
  );
  check(
    "Rocket steering clamps to viewport and diamond contact scores once",
    () => {
      const m = launch("rocket");
      key("KeyD");
      frames(180);
      key("KeyD", "keyup");
      assert(
        m.rocket.position.x <= m.limitX && m.rocket.position.x > 0,
        "rocket bounds failed",
      );
      const d = m.spawnDiamond(m.rocket.position.x, m.rocket.position.y),
        before = m.campaign.diamonds;
      frames(1);
      assert(m.campaign.diamonds === before + 1, "diamond missed");
      m.collect(d);
      assert(m.campaign.diamonds === before + 1, "diamond counted twice");
      game.arcade.exit();
    },
  );
  check(
    "Meteor, dangerous star and alien contacts respect three-hit shields and invulnerability",
    () => {
      const m = launch("rocket");
      m.campaign.invulnerable = 0;
      m.spawnObstacle("meteor", 0, -4);
      frames(1);
      assert(m.campaign.health === 2, "first hit missing");
      m.spawnObstacle("star", 0, -4);
      frames(1);
      assert(m.campaign.health === 2, "invulnerability failed");
      frames(125);
      m.spawnObstacle("star", 0, -4);
      frames(1);
      assert(m.campaign.health === 1, "second hit missing");
      frames(125);
      m.spawnObstacle("alien", 0, -4);
      frames(1);
      assert(m.campaign.phase === "failed", "third hit did not finish");
      assert(game.arcade.hud.resultVisible, "retry panel missing");
      game.arcade.exit();
    },
  );
  check("Retry restores only the current rocket level", () => {
    const m = launch("rocket");
    m.campaign.level = 4;
    m.campaign.health = 1;
    m.campaign.invulnerable = 0;
    m.spawnObstacle("meteor", 0, -4);
    frames(1);
    click("Retry Level");
    assert(
      m.campaign.level === 4 &&
        m.campaign.health === 3 &&
        m.campaign.diamonds === 0,
      "retry reset campaign",
    );
    game.arcade.exit();
  });
  check(
    "All ten rocket levels collect 50, reset health, finish and replay",
    () => {
      const m = launch("rocket");
      for (let level = 1; level <= 10; level++) {
        assert(m.campaign.level === level, "level skipped");
        for (let i = 0; i < 55 && m.campaign.phase === "playing"; i++) {
          m.spawnDiamond(m.rocket.position.x, m.rocket.position.y);
          frames(1);
        }
        assert(m.campaign.diamonds === 50, "goal not 50");
        if (level < 10) {
          assert(
            m.campaign.phase === "level-clear",
            "no inter-level celebration",
          );
          frames(122);
          assert(
            m.campaign.health === 3 && m.campaign.diamonds === 0,
            "new level not reset",
          );
        }
      }
      assert(
        m.campaign.phase === "complete" && game.arcade.hud.resultVisible,
        "final celebration absent",
      );
      click("Play Again");
      assert(
        m.campaign.level === 1 && m.campaign.health === 3,
        "campaign replay failed",
      );
      game.arcade.exit();
    },
  );
  check("Escape and visible Exit Game work from every game", () => {
    for (const id of ["bubble", "memory", "rocket"]) {
      launch(id);
      key("Escape");
      key("Escape", "keyup");
      assert(game.mode === "playing" && !game.arcade.current, "Escape failed");
      launch(id);
      document.querySelector("#arcade-exit").click();
      assert(
        game.mode === "playing" && !game.arcade.current,
        "Exit Game failed",
      );
    }
  });
  check("Pausing stops game clocks and sounds, then resumes", () => {
    const m = launch("memory");
    frames(60);
    game.arcade.pause();
    const time = m.round.previewRemaining;
    frames(180);
    assert(time === m.round.previewRemaining, "preview ran while paused");
    assert(game.arcade.audio.voices.size === 0, "sound continued");
    click("Continue Game");
    frames(30);
    assert(m.round.previewRemaining < time, "resume failed");
    game.arcade.exit();
  });
  check("Mute persists across games and all audio voices stop on exit", () => {
    launch("bubble");
    document.querySelector("#arcade-mute").click();
    assert(game.arcade.audio.muted, "mute failed");
    game.arcade.audio.play("pop");
    assert(game.arcade.audio.voices.size === 0, "muted sound created");
    game.arcade.exit();
    launch("rocket");
    assert(game.arcade.audio.muted, "mute not retained");
    document.querySelector("#arcade-mute").click();
    game.arcade.exit();
    assert(game.arcade.audio.voices.size === 0, "voices leaked");
  });
  check(
    "Repeated entries dispose game GPU resources and restore one player",
    () => {
      game.enter("arcade");
      render();
      const samples = [];
      // First cycle warms town geometry newly visible from each different cabinet.
      for (let i = 0; i < 3; i++) {
        for (const id of ["bubble", "memory", "rocket"]) {
          launch(id);
          frames(5);
          render();
          game.arcade.exit();
          render();
        }
        samples.push({ ...game.renderer.info.memory });
      }
      assert(
        samples[1].geometries === samples[2].geometries,
        "GPU geometry leak: " + JSON.stringify(samples),
      );
      assert(
        samples[1].textures === samples[2].textures,
        "GPU texture leak: " + JSON.stringify(samples),
      );
      assert(
        document.querySelectorAll("#arcade-layer").length === 1,
        "duplicate HUD",
      );
      assert(game.arcade.audio.voices.size === 0, "audio leak");
      assert(
        !game.player.model.getObjectByName("bubble-equipment"),
        "equipment leak",
      );
    },
  );
  game.enter("arcade");
  game.player.teleport(100, 1);
  game.follow.reset();
  frames(1);
  render();
  const report = document.createElement("details");
  report.id = "arcade-test-report";
  report.open = true;
  report.style.cssText =
    "position:absolute;top:170px;left:15px;z-index:30;max-height:65vh;overflow:auto;max-width:90%;background:#fffbedf5;color:#264f58;padding:15px;border-radius:16px;font:12px/1.6 monospace;border:2px solid #629592";
  const summary = document.createElement("summary");
  summary.textContent =
    results.filter((r) => r.startsWith("PASS")).length +
    "/" +
    results.length +
    " arcade integration checks passed";
  report.append(summary);
  for (const result of results) {
    const p = document.createElement("div");
    p.textContent = result;
    report.append(p);
  }
  for (const id of ["bubble", "memory", "rocket"]) {
    const button = document.createElement("button");
    button.textContent = "Inspect " + id;
    button.style.cssText = "margin:8px;padding:9px";
    button.onclick = () => {
      report.hidden = true;
      launch(id);
    };
    report.append(button);
  }
  const soundButton = document.createElement("button");
  soundButton.textContent = "Check sound output";
  soundButton.style.cssText = "margin:8px;padding:9px";
  soundButton.onclick = async () => {
    game.arcade.audio.unlock();
    if (!game.arcade.audio.context) {
      soundButton.textContent = "Audio unavailable";
      return;
    }
    await game.arcade.audio.context.resume();
    game.arcade.audio.mute(false);
    game.arcade.audio.play("pop");
    const audible =
      game.arcade.audio.context.state === "running" &&
      game.arcade.audio.voices.size > 0;
    soundButton.textContent = audible
      ? "PASS · Audio running; pop tone generated"
      : "FAIL · No running audio voice";
  };
  report.append(soundButton);
  document.querySelector("#game").append(report);
  console.info(results.join("\n"));
}
