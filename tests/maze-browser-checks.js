import {
  MAZE_START,
  MAZE_FINISH,
  mazePoint,
} from "../shared/world/corn-maze.js";
export function runMazeChecks(game) {
  const m = game.cornMaze,
    results = [];
  const check = (name, fn) => {
    try {
      fn();
      results.push("PASS · " + name);
    } catch (e) {
      results.push("FAIL · " + name + " · " + e.message);
    }
  };
  const assert = (v) => {
    if (!v) throw Error("Check failed");
  };
  check("Enter tractor and show controls", () => {
    m.enter();
    assert(m.occupied && game.player.inVehicle && !m.panel.hidden);
  });
  check("Drive the complete maze route through actual town colliders", () => {
    const queue = [[[16, 11]]],
      seen = new Set();
    let route;
    while (queue.length) {
      const path = queue.shift(),
        [x, z] = path.at(-1),
        key = `${x},${z}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (x === 0 && z === 1) {
        route = path;
        break;
      }
      for (const [a, b] of [
        [x + 1, z],
        [x - 1, z],
        [x, z + 1],
        [x, z - 1],
      ])
        if (m.grid[b]?.[a] === 0 && !seen.has(`${a},${b}`))
          queue.push([...path, [a, b]]);
    }
    assert(route);
    const original = game.input;
    game.input = { down: (...k) => k.includes("KeyW"), consume: () => false };
    try {
      for (const [x, z] of route) {
        const q = mazePoint(x, z),
          dx = q.x - m.model.position.x,
          dz = q.z - m.model.position.z;
        m.model.rotation.y = Math.atan2(dx, dz);
        m.update(Math.hypot(dx, dz) / 6);
        assert(
          Math.hypot(m.model.position.x - q.x, m.model.position.z - q.z) < 0.01,
        );
      }
      assert(m.complete);
    } finally {
      game.input = original;
    }
  });
  check("Finish feedback and replay reset", () => {
    assert(m.panel.textContent.includes("You found the finish"));
    m.reset();
    m.sync();
    assert(!m.complete && m.model.position.x === MAZE_START.x);
  });
  check("Safe exit restores character", () => {
    m.exit();
    assert(!game.player.inVehicle && !m.occupied && game.player.model.visible);
  });
  const panel = document.createElement("div");
  panel.id = "maze-test-results";
  panel.style.cssText =
    "position:absolute;bottom:100px;left:20px;padding:16px;background:#fff8e8;color:#234;z-index:40";
  panel.textContent = results.join("\n");
  panel.style.whiteSpace = "pre-line";
  document.querySelector("#hud").append(panel);
}
