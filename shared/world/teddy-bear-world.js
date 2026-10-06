import * as THREE from "three";
import { box, cylinder, blob, label, material } from "./models.js";

export const TEDDY_WORLD_SITE = Object.freeze({ x: -80, z: -2210, minX: -150, maxX: -10, minZ: -2110, maxZ: -2310 });
const LAKE = Object.freeze({ x: -115, z: -2270, rx: 22, rz: 15 });

export class TeddyBearWorld {
  constructor(game) {
    this.game = game;
    this.time = 0;
    this.group = new THREE.Group();
    this.group.name = "Teddy Bear World";
    const area = game.areas.town;
    area.group.add(this.group);
    const S = TEDDY_WORLD_SITE;
    const ground = new THREE.Mesh(new THREE.CircleGeometry(75, 48), material(0xf2e3c9));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(S.x, -0.01, S.z);
    ground.receiveShadow = true;
    this.group.add(ground);
    const flowerColors = [0xff9ec6, 0xffd166, 0xc3aef0, 0xff8f6b, 0x9fe8c9];
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 12 + Math.random() * 55;
      const x = S.x + Math.cos(a) * r;
      const z = S.z + Math.sin(a) * r * 0.8;
      if (this.inLake(x, z)) continue;
      const f = blob(this.group, x, 0.15, z, 0.22, flowerColors[i % flowerColors.length], 1);
      f.scale.y = 0.6;
      cylinder(this.group, x, 0.08, z, 0.03, 0.03, 0.25, 0x5f9e5a, 5);
    }
    label(this.group, "\uD83E\uDDF8 TEDDY BEAR WORLD", -14, 5, S.z, 14, "#fff4db", "#7a4a21").rotation.y = -Math.PI / 2;
    box(this.group, -45, 0.005, S.z, 60, 0.02, 6, 0xe0c9a0);
    this.giants = [];
    const giantSpecs = [
      { x: -60, z: -2190, scale: 3.6, fur: 0xb07a4a, phase: 0 },
      { x: -100, z: -2220, scale: 3.2, fur: 0xe3c188, phase: 2.1 },
      { x: -78, z: -2252, scale: 3.9, fur: 0x7c5230, phase: 4.2 },
    ];
    for (const spec of giantSpecs) {
      const bear = makeTeddyBear(spec.scale, spec.fur);
      bear.group.position.set(spec.x, 0, spec.z);
      bear.group.rotation.y = Math.atan2(S.x - spec.x, S.z - spec.z);
      this.group.add(bear.group);
      this.giants.push({ ...bear, phase: spec.phase, baseY: 0 });
      area.colliders.push({ minX: spec.x - 2.2 * spec.scale, maxX: spec.x + 2.2 * spec.scale, minZ: spec.z - 2.2 * spec.scale, maxZ: spec.z + 2.2 * spec.scale, maxY: 4 * spec.scale });
    }
    this.smalls = [];
    const smallFurs = [0xb07a4a, 0xe3c188, 0x7c5230, 0xd9a066, 0xc98d5e];
    let placed = 0, guard = 0;
    while (placed < 14 && guard++ < 200) {
      const x = S.minX + 10 + Math.random() * (S.maxX - S.minX - 20);
      const z = S.minZ + 10 + Math.random() * (S.maxZ - S.minZ - 20);
      if (this.inLake(x, z)) continue;
      if (Math.hypot(x - -60, z - -2190) < 14) continue;
      if (Math.hypot(x - -100, z - -2220) < 13) continue;
      if (Math.hypot(x - -78, z - -2252) < 15) continue;
      const bear = makeTeddyBear(0.45 + Math.random() * 0.25, smallFurs[placed % smallFurs.length]);
      bear.group.position.set(x, 0, z);
      bear.group.rotation.y = Math.random() * Math.PI * 2;
      this.group.add(bear.group);
      this.smalls.push({ ...bear, phase: Math.random() * Math.PI * 2, baseY: 0 });
      placed++;
    }
    this.huggers = [];
    const hugSpots = [[-50, -2215], [-90, -2200], [-70, -2235]];
    for (let i = 0; i < hugSpots.length; i++) {
      const bear = makeTeddyBear(1.15, [0xb07a4a, 0xe3c188, 0xd9a066][i]);
      const [hx, hz] = hugSpots[i];
      bear.group.position.set(hx, 0, hz);
      this.group.add(bear.group);
      this.huggers.push({ ...bear, state: "wander", target: new THREE.Vector3(hx, 0, hz), stateTime: 0, phase: Math.random() * Math.PI * 2, cooldown: 0 });
    }
    this.buildLake();
    this.buildSteamboat();
    this.heartTex = makeHeartTexture();
    this.hearts = [];
    for (let i = 0; i < 24; i++) {
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.heartTex, transparent: true, opacity: 0, depthWrite: false }));
      spr.scale.set(0.9, 0.9, 1);
      this.group.add(spr);
      this.hearts.push({ spr, life: 0, vel: new THREE.Vector3() });
    }
  }
  inLake(x, z) { return ((x - LAKE.x) / (LAKE.rx + 4)) ** 2 + ((z - LAKE.z) / (LAKE.rz + 4)) ** 2 < 1; }
  buildLake() {
    const area = this.game.areas.town;
    const shore = new THREE.Mesh(new THREE.CircleGeometry(1, 48), material(0xe8d5a8));
    shore.rotation.x = -Math.PI / 2;
    shore.scale.set(LAKE.rx + 4, LAKE.rz + 4, 1);
    shore.position.set(LAKE.x, 0.0, LAKE.z);
    shore.receiveShadow = true;
    this.group.add(shore);
    const water = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshStandardMaterial({ color: 0x4fa8c9, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.92 }));
    water.rotation.x = -Math.PI / 2;
    water.scale.set(LAKE.rx, LAKE.rz, 1);
    water.position.set(LAKE.x, 0.03, LAKE.z);
    this.group.add(water);
    label(this.group, "\uD83E\uDDF8 HONEY LAKE", LAKE.x, 4, LAKE.z - LAKE.rz - 6, 8, "#e8f6ff", "#2a6a8a");
    area.colliders.push({ minX: LAKE.x - LAKE.rx + 3, maxX: LAKE.x + LAKE.rx - 3, minZ: LAKE.z - LAKE.rz + 3, maxZ: LAKE.z + LAKE.rz - 3, maxY: 2 });
  }
  buildSteamboat() {
    const area = this.game.areas.town;
    this.boat = new THREE.Group();
    this.boat.name = "Teddy Steamboat";
    const wood = 0x8a5a33, woodDark = 0x6b4226;
    box(this.boat, 0, 0.7, 0, 5.2, 1.4, 11, woodDark);
    box(this.boat, 0, 1.15, 3.2, 4.2, 0.5, 4.5, wood);
    box(this.boat, 0, 1.15, -3.2, 4.2, 0.5, 4.5, wood);
    box(this.boat, 0, 1.5, 0, 4.6, 0.18, 10.4, 0xa06a3c);
    box(this.boat, 0, 2.9, -1.2, 3.4, 2.6, 4.6, 0xf5ead2);
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) box(this.boat, 1.72 * side, 3.1, -2.6 + i * 1.4, 0.06, 0.9, 0.8, 0x3a5a6a);
    box(this.boat, 0, 4.35, -1.2, 3.8, 0.25, 5.0, 0xb03a2e);
    this.stacks = [];
    for (const dx of [-0.8, 0.8]) {
      cylinder(this.boat, dx, 5.6, -1.2, 0.42, 0.42, 2.4, 0x2e2a28, 12);
      cylinder(this.boat, dx, 6.7, -1.2, 0.5, 0.42, 0.5, 0xb03a2e, 12);
      this.stacks.push(new THREE.Vector3(dx, 6.9, -1.2));
    }
    for (const side of [-1, 1]) {
      const wheel = cylinder(this.boat, 2.75 * side, 0.9, 0.5, 1.3, 1.3, 0.5, 0x7a4e2c, 12);
      wheel.rotation.z = Math.PI / 2;
      (this.paddleWheels ??= []).push(wheel);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const paddle = box(this.boat, 2.75 * side, 0.9 + Math.sin(a) * 1.1, 0.5 + Math.cos(a) * 1.1, 0.55, 0.28, 0.28, 0x5f3d22);
        paddle.rotation.x = a;
      }
    }
    for (const [x, z, w, d] of [[0, 5.1, 4.6, 0.12], [0, -5.1, 4.6, 0.12], [2.25, 0, 0.12, 10.2], [-2.25, 0, 0.12, 10.2]]) {
      box(this.boat, x, 2.1, z, w, 0.1, d, woodDark);
      for (let k = -4; k <= 4; k++) {
        const px = w > d ? (k / 4) * 2.1 : x;
        const pz = w > d ? z : (k / 4) * 4.8;
        box(this.boat, px, 1.8, pz, 0.08, 0.7, 0.08, woodDark);
      }
    }
    const crewFurs = [0xb07a4a, 0xe3c188, 0x7c5230, 0xd9a066];
    this.boatBears = [];
    const crewSpots = [[1.2, 3.6, 0.6], [-1.2, 3.6, -0.5], [1.2, -3.8, 2.8], [-1.2, -3.8, -2.9]];
    for (let i = 0; i < crewSpots.length; i++) {
      const [cx, cz, ry] = crewSpots[i];
      const bear = makeTeddyBear(0.75, crewFurs[i]);
      bear.group.position.set(cx, 1.6, cz);
      bear.group.rotation.y = ry;
      this.boat.add(bear.group);
      this.boatBears.push({ ...bear, phase: i * 1.7 });
    }
    const captain = makeTeddyBear(0.9, 0x8a5a33);
    captain.group.position.set(0, 1.6, 2.2);
    this.boat.add(captain.group);
    this.boatBears.push({ ...captain, phase: 5.1 });
    this.boatAngle = 0;
    this.boatBoarded = false;
    this.dockPos = new THREE.Vector3(LAKE.x, 0, LAKE.z - LAKE.rz - 2);
    this.boat.position.copy(this.dockPos);
    this.group.add(this.boat);
    box(this.group, LAKE.x, 0.35, LAKE.z - LAKE.rz - 4, 5, 0.25, 6, wood);
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) cylinder(this.group, LAKE.x + dx, -0.4, LAKE.z - LAKE.rz - 4 + dz, 0.18, 0.18, 1.6, woodDark, 8);
    this.boardItem = game.interactions.register({ id: "teddy-steamboat", area: "town", kind: "teddy-steamboat", x: this.dockPos.x, z: this.dockPos.z, radius: 5, label: "Board the Teddy Steamboat", hint: "E to board \u00B7 E to get off" });
    game.interactions.on("teddy-steamboat", () => this.board());
    this.steam = [];
  }
  board() {
    const g = this.game;
    if (g.mode !== "playing" || g.area.id !== "town" || this.boatBoarded) return;
    if (g.player.inVehicle || g.driving || g.flying || g.coaster.occupied) return;
    this.boatBoarded = true;
    g.player.inVehicle = true;
    g.ui.toast("All aboard the Teddy Steamboat! \uD83D\uDEA2\uD83E\uDDF8");
    g.audio?.oneShot("doorClose", 0.12);
    g.input.clear();
    g.canvas.focus();
  }
  exitBoat() {
    if (!this.boatBoarded) return;
    this.boatBoarded = false;
    const g = this.game;
    g.player.inVehicle = false;
    g.player.teleport(this.dockPos.x, this.dockPos.z + 2);
    g.player.model.visible = true;
    g.input.clear();
    g.interactionCooldown = 0.4;
    g.canvas.focus();
    g.audio?.oneShot("doorClose", 0.12);
  }
  spawnHeart(x, y, z) {
    const h = this.hearts.find((h) => h.life <= 0);
    if (!h) return;
    h.life = 1.6;
    h.spr.position.set(x + (Math.random() - 0.5) * 1.2, y + Math.random() * 0.5, z + (Math.random() - 0.5) * 1.2);
    h.vel.set((Math.random() - 0.5) * 0.6, 1.4 + Math.random() * 0.6, (Math.random() - 0.5) * 0.6);
    h.spr.material.opacity = 1;
  }
  spawnSteam(worldPos) {
    const h = this.hearts.find((h, i) => i >= 12 && h.life <= 0);
    if (!h) return;
    h.life = 2.2;
    h.steam = true;
    h.spr.position.copy(worldPos);
    h.spr.position.x += (Math.random() - 0.5) * 0.5;
    h.spr.position.z += (Math.random() - 0.5) * 0.5;
    h.vel.set((Math.random() - 0.5) * 0.4, 2.2, (Math.random() - 0.5) * 0.4);
    h.spr.material.opacity = 0.75;
    h.spr.material.color.set(0xeeeeee);
    h.spr.scale.set(1.6, 1.6, 1);
  }
  update(dt) {
    const g = this.game;
    this.time += dt;
    const t = this.time;
    for (const bear of this.giants) {
      const p = bear.phase;
      bear.body.scale.y = 1 + Math.sin(t * 0.9 + p) * 0.025;
      bear.group.rotation.z = Math.sin(t * 0.5 + p) * 0.02;
      bear.head.rotation.z = Math.sin(t * 0.7 + p) * 0.09;
      bear.head.rotation.y = Math.sin(t * 0.35 + p * 2) * 0.25;
      bear.armR.rotation.z = -0.25 + Math.max(0, Math.sin(t * 0.8 + p)) * 0.9;
      bear.armR.rotation.x = Math.sin(t * 2.2 + p) * 0.18 * Math.max(0, Math.sin(t * 0.8 + p));
      bear.armL.rotation.z = 0.18 + Math.sin(t * 0.9 + p + 1) * 0.08;
    }
    for (const bear of this.smalls) {
      bear.group.position.y = Math.abs(Math.sin(t * 1.3 + bear.phase)) * 0.12;
      bear.head.rotation.y = Math.sin(t * 0.6 + bear.phase) * 0.3;
    }
    for (const bear of this.boatBears) {
      bear.armR.rotation.z = -0.3 + Math.sin(t * 2.4 + bear.phase) * 0.45;
      bear.head.rotation.z = Math.sin(t * 1.1 + bear.phase) * 0.08;
    }
    const player = g.player;
    const px = player.position.x, pz = player.position.z;
    const playerActive = g.mode === "playing" && !player.inVehicle && !this.boatBoarded;
    for (const bear of this.huggers) {
      const bp = bear.group.position;
      bear.stateTime += dt;
      if (bear.cooldown > 0) bear.cooldown -= dt;
      const distToPlayer = Math.hypot(px - bp.x, pz - bp.z);
      if (bear.state === "wander") {
        if (playerActive && distToPlayer < 9 && bear.cooldown <= 0) { bear.state = "approach"; bear.stateTime = 0; }
        else {
          if (bear.stateTime > 4 || bp.distanceTo(bear.target) < 0.6) {
            const S = TEDDY_WORLD_SITE;
            bear.target.set(S.x + (Math.random() - 0.5) * 50, 0, S.z + (Math.random() - 0.5) * 40);
            bear.stateTime = 0;
          }
          this.walkBear(bear, bear.target, dt, 1.6);
        }
      } else if (bear.state === "approach") {
        if (!playerActive || distToPlayer > 12) { bear.state = "wander"; bear.stateTime = 0; }
        else if (distToPlayer < 2.0) {
          bear.state = "hug"; bear.stateTime = 0;
          g.ui.toast("Bear hug! \uD83E\uDD17\uD83E\uDDF8");
          g.audio?.oneShot("confirm", 0.2);
          for (let i = 0; i < 5; i++) this.spawnHeart(bp.x, 2.6, bp.z);
        } else this.walkBear(bear, player.position, dt, 3.2);
      } else if (bear.state === "hug") {
        bear.group.rotation.y = Math.atan2(px - bp.x, pz - bp.z);
        const k = Math.min(1, bear.stateTime / 0.4);
        bear.armL.rotation.z = 0.25 + k * 1.15;
        bear.armR.rotation.z = -0.25 - k * 1.15;
        bear.armL.rotation.x = -k * 0.5;
        bear.armR.rotation.x = -k * 0.5;
        bear.head.rotation.z = Math.sin(t * 6) * 0.05;
        if (Math.random() < dt * 6) this.spawnHeart(bp.x, 2.8, bp.z);
        bear.group.position.y = Math.abs(Math.sin(t * 8)) * 0.08;
        if (bear.stateTime > 2.2) { bear.state = "cooldown"; bear.stateTime = 0; bear.cooldown = 6; bear.group.position.y = 0; }
      } else if (bear.state === "cooldown") {
        bear.armL.rotation.z *= 1 - Math.min(1, dt * 4);
        bear.armR.rotation.z *= 1 - Math.min(1, dt * 4);
        bear.armL.rotation.x *= 1 - Math.min(1, dt * 4);
        bear.armR.rotation.x *= 1 - Math.min(1, dt * 4);
        if (bear.stateTime > 1.5) { bear.state = "wander"; bear.stateTime = 99; }
      }
      if (bear.state !== "hug" && bear.state !== "cooldown") {
        bear.armL.rotation.z = 0.18 + Math.sin(t * 1.4 + bear.phase) * 0.1;
        bear.armR.rotation.z = -0.18 - Math.sin(t * 1.4 + bear.phase) * 0.1;
      }
    }
    for (const h of this.hearts) {
      if (h.life <= 0) continue;
      h.life -= dt;
      h.spr.position.addScaledVector(h.vel, dt);
      h.vel.y *= 1 - dt * 0.4;
      const fade = Math.min(1, h.life / 0.8);
      h.spr.material.opacity = (h.steam ? 0.75 : 1) * fade;
      if (h.life <= 0) { h.spr.material.opacity = 0; h.steam = false; h.spr.material.color.set(0xffffff); h.spr.scale.set(0.9, 0.9, 1); }
    }
    const speed = this.boatBoarded ? 0.14 : 0;
    if (this.boatBoarded && g.input.consume("KeyE")) { this.exitBoat(); return; }
    this.boatAngle += speed * dt;
    const bx = LAKE.x + Math.cos(this.boatAngle) * (LAKE.rx - 7);
    const bz = LAKE.z + Math.sin(this.boatAngle) * (LAKE.rz - 6);
    const dockBlend = this.boatBoarded ? Math.min(1, (this.boatBlend = (this.boatBlend || 0) + dt * 0.25)) : (this.boatBlend = 0);
    this.boat.position.set(this.dockPos.x + (bx - this.dockPos.x) * dockBlend, Math.sin(t * 1.2) * 0.08, this.dockPos.z + (bz - this.dockPos.z) * dockBlend);
    this.boat.rotation.y = -this.boatAngle + Math.PI / 2 + Math.sin(t * 0.9) * 0.02;
    this.boat.rotation.z = Math.sin(t * 1.1) * 0.015;
    if (this.paddleWheels) for (const w of this.paddleWheels) w.rotation.x += speed * dt * 22;
    if (Math.random() < dt * (this.boatBoarded ? 9 : 3)) {
      const stack = this.stacks[Math.floor(Math.random() * 2)];
      const world = stack.clone().applyMatrix4(this.boat.matrixWorld);
      this.spawnSteam(world);
    }
    Object.assign(this.boardItem, { x: this.dockPos.x, z: this.dockPos.z });
    if (this.boatBoarded) {
      const p = g.player;
      p.position.copy(this.boat.position);
      p.heading = this.boat.rotation.y;
      p.sync();
      const seat = new THREE.Vector3(0, 1.6, 3.4);
      seat.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.boat.rotation.y);
      p.model.position.copy(this.boat.position).add(seat);
      p.model.rotation.y = this.boat.rotation.y;
      p.model.visible = true;
    }
  }
  walkBear(bear, target, dt, speed) {
    const bp = bear.group.position;
    const dx = target.x - bp.x, dz = target.z - bp.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.05) return;
    const step = Math.min(dist, speed * dt);
    bp.x += (dx / dist) * step;
    bp.z += (dz / dist) * step;
    bear.group.rotation.y = Math.atan2(dx, dz);
    bear.group.rotation.z = Math.sin(this.time * 9) * 0.06;
    bear.group.position.y = Math.abs(Math.sin(this.time * 9)) * 0.06;
  }
}

function makeTeddyBear(scale = 1, fur = 0xb07a4a, accent = 0xe8cfa0) {
  const bear = new THREE.Group();
  const s = scale;
  const smooth = (r) => new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), material(fur));
  const smoothAccent = (r) => new THREE.Mesh(new THREE.SphereGeometry(r, 20, 16), material(accent));
  const place = (mesh, x, y, z) => { mesh.position.set(x * s, y * s, z * s); mesh.castShadow = true; mesh.receiveShadow = true; bear.add(mesh); return mesh; };
  const body = place(smooth(1.0), 0, 1.1, 0);
  const belly = place(smoothAccent(0.68), 0, 1.05, 0.55);
  belly.scale.set(1, 1.15, 0.55);
  const head = new THREE.Group();
  head.position.set(0, 2.35 * s, 0);
  bear.add(head);
  const headBall = new THREE.Mesh(new THREE.SphereGeometry(0.65 * s, 20, 16), material(fur));
  headBall.castShadow = true;
  head.add(headBall);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.22 * s, 14, 12), material(fur));
    ear.position.set(0.42 * side * s, 0.48 * s, 0);
    ear.castShadow = true;
    head.add(ear);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.11 * s, 10, 8), material(accent));
    inner.position.set(0.42 * side * s, 0.48 * s, 0.14 * s);
    head.add(inner);
  }
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.28 * s, 14, 12), material(accent));
  snout.position.set(0, -0.1 * s, 0.5 * s);
  snout.scale.set(1, 0.8, 0.8);
  head.add(snout);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 10, 8), material(0x4a2f1d));
  nose.position.set(0, -0.02 * s, 0.72 * s);
  head.add(nose);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08 * s, 10, 8), material(0x2a1a10));
    eye.position.set(0.22 * side * s, 0.15 * s, 0.52 * s);
    head.add(eye);
  }
  const mkArm = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(0.95 * side * s, 1.7 * s, 0);
    bear.add(pivot);
    const arm = new THREE.Mesh(new THREE.SphereGeometry(0.32 * s, 14, 12), material(fur));
    arm.scale.set(1, 1.9, 1);
    arm.position.y = -0.55 * s;
    arm.castShadow = true;
    pivot.add(arm);
    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.16 * s, 10, 8), material(accent));
    paw.position.y = -1.05 * s;
    pivot.add(paw);
    return pivot;
  };
  const armL = mkArm(-1);
  const armR = mkArm(1);
  for (const side of [-1, 1]) {
    const foot = place(smooth(0.4), 0.45 * side, 0.35, 0.25);
    foot.scale.set(1, 0.8, 1.3);
    const pad = place(smoothAccent(0.2), 0.45 * side, 0.3, 0.62);
    pad.scale.set(1, 0.7, 0.5);
  }
  return { group: bear, body, head, armL, armR, scale: s };
}

function makeHeartTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ff6b9d";
  ctx.font = "48px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("\u2665", 32, 34);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
