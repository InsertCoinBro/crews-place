import * as THREE from "three";
import { box, cylinder, label, material } from "./models.js";
import { moveHorizontal } from "../core/physics.js";

export const MAZE_SITE = Object.freeze({
  minX: -264,
  minZ: -76,
  size: 21,
  cell: 8,
});
export const MAZE_START = Object.freeze({ x: -91, z: 48 });
export function makeMaze() {
  const n = MAZE_SITE.size;
  const grid = Array.from({ length: n }, () => Array(n).fill(1));
  let seed = 8317;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const stack = [[19, 13]];
  grid[13][19] = 0;
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
  grid[13][20] = 0;
  grid[1][0] = 0;
  let removed = 0;
  for (let z = 2; z < n - 2 && removed < 28; z += 2) {
    for (let x = 2; x < n - 2 && removed < 28; x += 2) {
      if (grid[z][x] === 1 && random() < 0.35) {
        const openNeighbors =
          (grid[z - 1]?.[x] === 0 ? 1 : 0) +
          (grid[z + 1]?.[x] === 0 ? 1 : 0) +
          (grid[z]?.[x - 1] === 0 ? 1 : 0) +
          (grid[z]?.[x + 1] === 0 ? 1 : 0);
        if (openNeighbors >= 2) {
          grid[z][x] = 0;
          removed++;
        }
      }
    }
  }
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
    box(this.group, -180, -0.42, 8, 212, 0.8, 216, 0x92b973);
    box(this.group, -180, 0.008, 8, 168, 0.04, 168, 0xc6a26a);
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
    this.setupHalloween();
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

  setupHalloween() {
    const g = this.group;
    this.scares = [];
    this.halloweenTime = 0;
    const makeScare = (build, x, z, triggerRadius = 10) => {
      const obj = new THREE.Group();
      build(obj);
      obj.position.set(x, 0, z);
      obj.scale.set(0.001, 0.001, 0.001);
      obj.visible = false;
      g.add(obj);
      this.scares.push({ obj, x, z, triggerRadius, state: "hidden", timer: 0 });
    };
    const buildGhost = (obj) => {
      const mat = new THREE.MeshStandardMaterial({ color: 0xf4f4ff, transparent: true, opacity: 0.92, roughness: 0.6 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), mat);
      body.position.y = 1.6;
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.4, 12), mat);
      tail.position.y = 0.7;
      tail.rotation.x = Math.PI;
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a2e });
      for (const ex of [-0.3, 0.3]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), eyeMat);
        eye.position.set(ex, 1.75, 0.75);
        obj.add(eye);
      }
      const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), eyeMat);
      mouth.position.set(0, 1.35, 0.75);
      mouth.scale.y = 1.4;
      obj.add(mouth, body, tail);
    };
    const buildZombie = (obj) => {
      const skin = new THREE.MeshStandardMaterial({ color: 0x6aa84f, roughness: 0.8 });
      const shirt = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.5), shirt);
      body.position.y = 1.15;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), skin);
      head.position.y = 2.1;
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      for (const ex of [-0.15, 0.15]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), eyeMat);
        eye.position.set(ex, 2.15, 0.32);
        obj.add(eye);
      }
      for (const ax of [-0.75, 0.75]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.25), skin);
        arm.position.set(ax, 1.5, 0.35);
        obj.add(arm);
      }
      obj.add(body, head);
    };
    const buildVampire = (obj) => {
      const skin = new THREE.MeshStandardMaterial({ color: 0xe8d5c4, roughness: 0.7 });
      const cape = new THREE.MeshStandardMaterial({ color: 0x8b0000, roughness: 0.9, side: THREE.DoubleSide });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.4), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
      body.position.y = 1.2;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10), skin);
      head.position.y = 2.15;
      const capeMesh = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.8, 8, 1, true), cape);
      capeMesh.position.y = 1.1;
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      for (const ex of [-0.12, 0.12]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeMat);
        eye.position.set(ex, 2.2, 0.3);
        obj.add(eye);
      }
      const fangMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (const fx of [-0.08, 0.08]) {
        const fang = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 6), fangMat);
        fang.position.set(fx, 1.95, 0.32);
        fang.rotation.x = Math.PI;
        obj.add(fang);
      }
      obj.add(body, head, capeMesh);
    };
    const scareSpots = [
      { build: buildGhost, col: 5, row: 5 },
      { build: buildZombie, col: 12, row: 8 },
      { build: buildVampire, col: 8, row: 14 },
      { build: buildGhost, col: 16, row: 10 },
      { build: buildZombie, col: 3, row: 12 },
      { build: buildVampire, col: 14, row: 16 },
    ];
    for (const s of scareSpots) {
      const pt = mazePoint(s.col, s.row);
      makeScare(s.build, pt.x, pt.z, 9);
    }
    const pumpkinMat = new THREE.MeshStandardMaterial({ color: 0xe8722a, roughness: 0.7 });
    const pumpkinGlow = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff8c00, emissiveIntensity: 0.6 });
    const pumpkinSpots = [[4, 3], [10, 6], [15, 4], [7, 10], [13, 12], [18, 8], [5, 16], [11, 18], [17, 15], [2, 8]];
    for (const [col, row] of pumpkinSpots) {
      const pt = mazePoint(col, row);
      const pumpkin = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), pumpkinMat);
      body.position.y = 0.5;
      body.scale.y = 0.85;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.3, 6), new THREE.MeshStandardMaterial({ color: 0x4a7c2e }));
      stem.position.y = 1.0;
      const eyeGeo = new THREE.ConeGeometry(0.12, 0.2, 4);
      for (const ex of [-0.2, 0.2]) {
        const eye = new THREE.Mesh(eyeGeo, pumpkinGlow);
        eye.position.set(ex, 0.65, 0.48);
        eye.rotation.x = -0.2;
        pumpkin.add(eye);
      }
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.05), pumpkinGlow);
      mouth.position.set(0, 0.35, 0.5);
      pumpkin.add(mouth, body, stem);
      pumpkin.position.set(pt.x + 2.5, 0, pt.z + 2.5);
      pumpkin.rotation.y = Math.random() * Math.PI * 2;
      g.add(pumpkin);
    }
    this.clouds = [];
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3a, transparent: true, opacity: 0.92, roughness: 1 });
    for (let i = 0; i < 14; i++) {
      const cloud = new THREE.Group();
      const puffs = 4 + Math.floor(Math.random() * 3);
      for (let j = 0; j < puffs; j++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(4 + Math.random() * 4, 10, 8), cloudMat);
        puff.position.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 8);
        puff.scale.y = 0.55;
        cloud.add(puff);
      }
      cloud.position.set(-264 + Math.random() * 168, 26 + Math.random() * 8, -76 + Math.random() * 168);
      cloud.userData.driftSpeed = 0.4 + Math.random() * 0.6;
      g.add(cloud);
      this.clouds.push(cloud);
    }
    const rainCount = 900;
    const rainGeo = new THREE.BufferGeometry();
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = -264 + Math.random() * 168;
      rainPos[i * 3 + 1] = Math.random() * 30;
      rainPos[i * 3 + 2] = -76 + Math.random() * 168;
    }
    rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
    this.rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0x8ab4ff, size: 0.18, transparent: true, opacity: 0.65 }));
    this.rain.name = "maze-rain";
    g.add(this.rain);
    this.rainGeo = rainGeo;
    this.rainCount = rainCount;
    label(g, "🎃 HAUNTED CORN MAZE 🎃", -94, 4, 40, 12, "#ff8c00", "#1a0a2e").rotation.y = Math.PI / 2;
  }

  updateHalloween(dt) {
    this.halloweenTime += dt;
    const t = this.halloweenTime;
    const tractor = this.model.position;
    for (const scare of this.scares) {
      const dist = Math.hypot(tractor.x - scare.x, tractor.z - scare.z);
      if (scare.state === "hidden" && dist < scare.triggerRadius && this.occupied) {
        scare.state = "popping";
        scare.timer = 0;
        scare.obj.visible = true;
        this.game.audio?.oneShot("bubble", 0.35);
      } else if (scare.state === "popping") {
        scare.timer += dt;
        const k = Math.min(1, scare.timer / 0.35);
        const s = 1.2 * (1 - Math.pow(1 - k, 3)) + 0.2 * Math.sin(k * Math.PI * 3) * (1 - k);
        scare.obj.scale.set(s, s, s);
        scare.obj.rotation.y = Math.atan2(tractor.x - scare.x, tractor.z - scare.z);
        if (k >= 1) { scare.state = "showing"; scare.timer = 0; }
      } else if (scare.state === "showing") {
        scare.timer += dt;
        scare.obj.position.y = Math.sin(t * 6) * 0.15;
        scare.obj.rotation.y = Math.atan2(tractor.x - scare.x, tractor.z - scare.z);
        if (scare.timer > 2.5 || dist > scare.triggerRadius + 6) { scare.state = "sinking"; scare.timer = 0; }
      } else if (scare.state === "sinking") {
        scare.timer += dt;
        const k = Math.min(1, scare.timer / 0.6);
        const s = Math.max(0.001, 1 - k);
        scare.obj.scale.set(s, s, s);
        if (k >= 1) { scare.state = "hidden"; scare.obj.visible = false; scare.obj.position.y = 0; }
      }
    }
    for (const cloud of this.clouds) {
      cloud.position.x += cloud.userData.driftSpeed * dt;
      if (cloud.position.x > -90) cloud.position.x = -268;
    }
    const pos = this.rainGeo.attributes.position;
    for (let i = 0; i < this.rainCount; i++) {
      pos.array[i * 3 + 1] -= dt * 22;
      if (pos.array[i * 3 + 1] < 0) {
        pos.array[i * 3 + 1] = 30;
        pos.array[i * 3] = -264 + Math.random() * 168;
        pos.array[i * 3 + 2] = -76 + Math.random() * 168;
      }
    }
    pos.needsUpdate = true;
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
    g.audio?.oneShot("doorClose", 0.12);
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
    g.audio?.oneShot("doorClose", 0.12);
  }
  update(dt) {
    const g = this.game;
    if (this.updateHalloween) this.updateHalloween(dt);
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
    this.audioSpeed = speed;
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
      g.audio?.oneShot("confirm", 0.28);
      g.ui.toast("You found your way through the corn maze!");
    }
  }
}
