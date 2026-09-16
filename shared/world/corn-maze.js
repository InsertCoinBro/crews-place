import * as THREE from "three";
import { box, cylinder, label, material } from "./models.js";
import { moveHorizontal } from "../core/physics.js";

export const MAZE_SITE = Object.freeze({
  minX: -232,
  minZ: -44,
  size: 17,
  cell: 8,
});
export const MAZE_START = Object.freeze({ x: -91, z: 48 });
export function makeMaze() {
  const n = MAZE_SITE.size;
  const grid = Array.from({ length: n }, () => Array(n).fill(1));
  let seed = 8317;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const stack = [[15, 11]];
  grid[11][15] = 0;
  while (stack.length) {
    const [x, z] = stack[stack.length - 1];
    const choices = [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ].filter(
      ([dx, dz]) =>
        x + dx > 0 &&
        x + dx < n - 1 &&
        z + dz > 0 &&
        z + dz < n - 1 &&
        grid[z + dz][x + dx],
    );
    if (!choices.length) {
      stack.pop();
      continue;
    }
    const [dx, dz] = choices[Math.floor(random() * choices.length)];
    grid[z + dz / 2][x + dx / 2] = grid[z + dz][x + dx] = 0;
    stack.push([x + dx, z + dz]);
  }
  grid[11][16] = 0;
  grid[1][0] = 0;
  return grid;
}
export const mazePoint = (col, row) => ({
  x: MAZE_SITE.minX + (col + 0.5) * 8,
  z: MAZE_SITE.minZ + (row + 0.5) * 8,
});
export const MAZE_FINISH = mazePoint(0, 1);
export function mazeWalls(grid) {
  return grid.flatMap((row, z) =>
    row.flatMap((wall, x) =>
      wall
        ? [
            {
              minX: MAZE_SITE.minX + x * 8,
              maxX: MAZE_SITE.minX + (x + 1) * 8,
              minZ: MAZE_SITE.minZ + z * 8,
              maxZ: MAZE_SITE.minZ + (z + 1) * 8,
              maxY: 4.4,
            },
          ]
        : [],
    ),
  );
}
export function driveTractor(model, dt, input, colliders, bounds) {
  const turn =
    Number(input.down("KeyA", "ArrowLeft")) -
    Number(input.down("KeyD", "ArrowRight"));
  model.rotation.y += turn * 1.35 * dt;
  const speed =
    (Number(input.down("KeyW", "ArrowUp")) -
      Number(input.down("KeyS", "ArrowDown"))) *
    6;
  moveHorizontal(
    model.position,
    Math.sin(model.rotation.y) * speed * dt,
    Math.cos(model.rotation.y) * speed * dt,
    colliders,
    bounds,
    1.8,
  );
  return speed;
}

export class CornMaze {
  constructor(game) {
    this.game = game;
    this.grid = makeMaze();
    this.walls = mazeWalls(this.grid);
    this.group = new THREE.Group();
    this.group.name = "Harvest Corn Maze";
    const area = game.areas.town;
    area.group.add(this.group);
    area.colliders.push(...this.walls);
    box(this.group, -169, -0.42, 24, 180, 0.8, 184, 0x92b973);
    box(this.group, -164, 0.008, 24, 136, 0.04, 136, 0xc6a26a);
    box(this.group, -91, 0.025, 48, 26, 0.045, 8, 0xc6a26a);
    // Dense corn uses instancing so thousands of plants share a few draw calls.
    const count = this.walls.length * 36;
    const stalks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.055, 0.085, 3.7, 5),
      material(0x78913a),
      count,
    );
    const leaves = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.55, 2.4, 4),
      material(0x739b40),
      count * 2,
    );
    const ears = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.13, 0.17, 0.65, 6),
      material(0xe6be4b),
      count,
    );
    const dummy = new THREE.Object3D();
    let i = 0;
    for (const w of this.walls) {
      box(
        this.group,
        (w.minX + w.maxX) / 2,
        1.25,
        (w.minZ + w.maxZ) / 2,
        8,
        2.5,
        8,
        0x789640,
      );
      for (let r = 0; r < 6; r++)
        for (let c = 0; c < 6; c++) {
          const x = w.minX + 0.65 + c * 1.34,
            z = w.minZ + 0.65 + r * 1.34;
          dummy.position.set(x, 1.85, z);
          dummy.rotation.set(0, 0, 0);
          dummy.updateMatrix();
          stalks.setMatrixAt(i, dummy.matrix);
          for (let j = 0; j < 2; j++) {
            dummy.position.y = 2.3 + j * 0.65;
            dummy.rotation.set(0, i * 0.7, j ? 0.65 : -0.65);
            dummy.updateMatrix();
            leaves.setMatrixAt(i * 2 + j, dummy.matrix);
          }
          dummy.position.set(x + 0.15, 2.9, z);
          dummy.rotation.set(0, 0, -0.2);
          dummy.updateMatrix();
          ears.setMatrixAt(i++, dummy.matrix);
        }
    }
    this.group.add(stalks, leaves, ears);
    label(
      this.group,
      "CORN MAZE · TRACTOR START",
      -94,
      4,
      40,
      10,
      "#fff4cd",
      "#456139",
    ).rotation.y = Math.PI / 2;
    label(
      this.group,
      "FINISH · YOU FOUND IT!",
      MAZE_FINISH.x,
      5,
      MAZE_FINISH.z,
      12,
      "#fff4cd",
      "#456139",
    ).rotation.y = Math.PI / 2;
    box(this.group, MAZE_FINISH.x, 0.05, MAZE_FINISH.z, 7, 0.06, 7, 0xe7c35a);
    label(this.group, "← CORN MAZE", -81, 3.5, 52, 8, "#fff4cd", "#456139");
    this.model = new THREE.Group();
    this.model.name = "Maze tractor";
    box(this.model, 0, 0.85, 0, 1.65, 0.5, 2.6, 0x397f53);
    box(this.model, 0, 1.35, 0.65, 1.3, 0.8, 1.3, 0x51974b);
    box(this.model, 0, 1.25, -0.65, 0.9, 0.25, 0.7, 0x584738);
    box(this.model, 0, 1.65, -0.92, 0.9, 0.8, 0.2, 0x584738);
    for (const x of [-0.72, 0.72])
      for (const z of [-1, 0.5])
        box(this.model, x, 2, z, 0.09, 2.2, 0.09, 0xe3cf8d);
    box(this.model, 0, 3.05, -0.2, 2, 0.16, 2.1, 0xe9cc68);
    cylinder(this.model, 0.4, 2.1, 1, 0.09, 0.09, 1.3, 0x484a42, 8);
    this.wheels = [];
    for (const x of [-0.95, 0.95])
      for (const z of [-0.85, 0.9]) {
        const wheel = cylinder(
          this.model,
          x,
          z < 0 ? 0.65 : 0.45,
          z,
          z < 0 ? 0.65 : 0.45,
          z < 0 ? 0.65 : 0.45,
          0.38,
          0x303931,
          12,
        );
        wheel.rotation.z = Math.PI / 2;
        this.wheels.push(wheel);
        const hub = cylinder(
          this.model,
          x * 1.22,
          z < 0 ? 0.65 : 0.45,
          z,
          0.25,
          0.25,
          0.05,
          0xeacb61,
          12,
        );
        hub.rotation.z = Math.PI / 2;
      }
    this.group.add(this.model);
    this.item = game.interactions.register({
      id: "maze-tractor",
      area: "town",
      kind: "maze-tractor",
      ...MAZE_START,
      radius: 4,
      label: "Drive the corn maze tractor",
      hint: "E to enter · W/S forward/reverse · A/D steer",
    });
    game.interactions.on("maze-tractor", () => this.enter());
    this.panel = document.createElement("section");
    this.panel.className = "maze-controls";
    this.panel.hidden = true;
    this.panel.innerHTML =
      '<strong>🌽 Harvest Corn Maze</strong><p>W / ↑ forward · S / ↓ reverse<br>A / ← turn left · D / → turn right<br>Release to stop. Turn even while stopped.</p><p data-maze-status role="status">Find the golden finish. Take your time!</p><button data-maze-reset>Return to start</button> <button data-maze-exit>Exit tractor (E)</button>';
    document.querySelector("#hud").append(this.panel);
    this.panel.querySelector("[data-maze-reset]").onclick = () => {
      this.reset();
      this.sync();
      game.input.clear();
      game.canvas.focus();
    };
    this.panel.querySelector("[data-maze-exit]").onclick = () => this.exit();
    this.reset();
  }
  reset() {
    this.model.position.set(MAZE_START.x, 0, MAZE_START.z);
    this.model.rotation.y = -Math.PI / 2;
    this.complete = false;
    Object.assign(this.item, MAZE_START);
    this.panel.querySelector("[data-maze-status]").textContent =
      "Find the golden finish. Take your time!";
  }
  enter() {
    const g = this.game;
    if (
      g.mode !== "playing" ||
      g.area.id !== "town" ||
      g.driving ||
      g.flying ||
      g.coaster.occupied
    )
      return;
    this.occupied = true;
    g.player.inVehicle = true;
    this.panel.hidden = false;
    this.sync();
    g.input.clear();
    g.follow.reset(this.model.rotation.y + Math.PI);
    g.canvas.focus();
  }
  sync() {
    const p = this.game.player;
    p.position.copy(this.model.position);
    p.heading = this.model.rotation.y;
    p.sync();
  }
  exit() {
    if (!this.occupied) return;
    this.occupied = false;
    this.panel.hidden = true;
    const g = this.game;
    g.player.inVehicle = false;
    g.player.teleport(this.model.position.x, this.model.position.z);
    g.player.model.visible = true;
    g.input.clear();
    g.interactionCooldown = 0.4;
    g.canvas.focus();
  }
  update(dt) {
    const g = this.game;
    if (g.input.consume("KeyE")) {
      this.exit();
      return;
    }
    const speed = driveTractor(
      this.model,
      dt,
      g.input,
      g.area.colliders,
      g.area.bounds,
    );
    for (const wheel of this.wheels) wheel.rotation.x += speed * dt;
    Object.assign(this.item, {
      x: this.model.position.x,
      z: this.model.position.z,
    });
    this.sync();
    if (
      !this.complete &&
      Math.hypot(
        this.model.position.x - MAZE_FINISH.x,
        this.model.position.z - MAZE_FINISH.z,
      ) < 3
    ) {
      this.complete = true;
      this.panel.querySelector("[data-maze-status]").textContent =
        "You found the finish! 🌻 Explore more or return to start to play again.";
      g.ui.toast("You found your way through the corn maze!");
    }
  }
}
