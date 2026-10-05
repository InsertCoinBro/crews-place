import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { label } from "./models.js";
import { createRaceShip, RaceEffects } from "./space-race-effects.js";
import {
  createSpaceRaceTrack,
  SpaceRaceRun,
  RACE_ENTRY,
  RACE_COLORS,
  RACE_LAPS,
  RACE_BOOST_SPEED,
} from "./space-race-track.js";

const v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const RACER_DETAIL_DISTANCE = 85;
const material = (color) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.22,
    fog: false,
  });
function part(parent, geometry, color, position) {
  const m = new THREE.Mesh(geometry, material(color));
  m.position.set(...position);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(parent, position, size, color) {
  return part(
    parent,
    new RoundedBoxGeometry(...size, 2, 0.15),
    color,
    position,
  );
}
function seated(model) {
  model.traverse((n) => {
    if (/DEF-thigh[LR]$|^Thigh[LR]$/.test(n.name)) n.rotation.x = -Math.PI / 2;
    if (/DEF-shin[LR]$|^Shin[LR]$/.test(n.name)) n.rotation.x = Math.PI / 2;
  });
}

export class SpaceRace {
  constructor(game, alienTemplate) {
    this.game = game;
    this.track = createSpaceRaceTrack();
    this.run = new SpaceRaceRun(this.track);
    this.occupied = false;
    this.group = new THREE.Group();
    this.group.name = "Moonbeam Rally · west moon raceway";
    game.areas.space.group.add(this.group);
    this.autoThrottle = true;
    this.gentle = false;
    this.wins = 0;
    try {
      this.wins = Math.max(
        0,
        Number(
          globalThis.localStorage?.getItem("crews-place-moonbeam-trophies"),
        ) || 0,
      );
    } catch {}
    this.buildTrack();
    this.effects = new RaceEffects(this.group, this.track);
    this.buildStation();
    this.buildHUD();
    this.karts = [0x00cddd, 0x9555ee, 0xff8220].map((c) => {
      const k = createRaceShip(c);
      this.group.add(k);
      return k;
    });
    this.aliens = [1, 2].map((id) => {
      const model = clone(alienTemplate);
      model.name = id === 1 ? "Nova · tactical racer" : "Pip · tactical racer";
      model.position.set(0, 0.48, -0.55);
      model.rotation.set(0, 0, 0);
      model.visible = true;
      seated(model);
      this.karts[id].add(model);
      if (globalThis.document) {
        const nameplate = label(
          this.karts[id],
          id === 1 ? "NOVA · 2" : "PIP · 3",
          0,
          3.3,
          -0.5,
          3,
          "#193447",
          "#fff5ce",
        );
        nameplate.rotation.y = Math.PI;
      }
      return model;
    });
    this.placeKarts();
    this.updateRacerVisibility();
    game.interactions.register({
      id: "space-race",
      kind: "space-race",
      area: "space",
      x: RACE_ENTRY.x,
      y: game.areas.space.groundY,
      z: RACE_ENTRY.z,
      radius: 5,
      label: "Race at Moonbeam Rally",
      hint: "E · Plasma spacecraft · Fire rings · Two-lap race",
    });
    game.interactions.on("space-race", () => this.board());
  }
  buildTrack() {
    const vertices = [],
      colors = [],
      indices = [],
      roadColors = RACE_COLORS.map((c) => new THREE.Color(c));
    const count = Math.ceil(this.track.length / 3);
    // Six strips: broad driving surface, soft colored shoulders, and raised
    // outer barriers. The same route coordinates constrain the vehicle.
    const lanes = [-10.5, -10, -8.6, 8.6, 10, 10.5];
    for (let i = 0; i <= count; i++) {
      const d = (i / count) * this.track.length,
        s = this.track.sample(d),
        color = roadColors[Math.floor((i / count) * 10) % 5];
      for (let j = 0; j < lanes.length; j++) {
        const p = s.position.clone().addScaledVector(s.right, lanes[j]);
        p.y += j === 0 || j === 5 ? 1.7 : j === 1 || j === 4 ? 0.5 : 0;
        vertices.push(...p.toArray());
        const c =
          j === 2 || j === 3
            ? color.clone().multiplyScalar(0.16).addScalar(0.04)
            : color;
        colors.push(c.r, c.g, c.b);
        if (i < count && j < lanes.length - 1) {
          const a = i * lanes.length + j,
            b = a + 1,
            c = a + lanes.length,
            e = c + 1;
          indices.push(a, c, b, b, c, e);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const road = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.46,
        metalness: 0.38,
        emissive: 0x224466,
        emissiveIntensity: 0.12,
        side: THREE.DoubleSide,
        fog: false,
      }),
    );
    road.name = "continuous-contained-raceway";
    road.receiveShadow = true;
    this.group.add(road);
    const markers = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.15, 0.04, 3),
      material(0xd3e6ed),
      Math.floor(this.track.length / 12) * 2,
    );
    const dummy = new THREE.Object3D();
    let index = 0;
    for (let i = 0; i < Math.floor(this.track.length / 12); i++)
      for (const lane of [-3.35, 3.35]) {
        const s = this.track.sample(i * 12, lane);
        dummy.position.copy(s.position);
        dummy.position.y += 0.025;
        dummy.rotation.set(0, s.heading, 0);
        dummy.updateMatrix();
        markers.setMatrixAt(index++, dummy.matrix);
      }
    this.group.add(markers);
    this.track.obstacles.forEach((o, i) => {
      const s = this.track.sample(o.distance, o.lane),
        bumper = new THREE.Group();
      bumper.position.copy(s.position);
      bumper.rotation.y = s.heading;
      box(bumper, [0, 0.6, 0], [3.3, 1.15, 2.1], 0x24354a);
      for (const side of [-1, 1]) {
        const stripe = box(
          bumper,
          [side * 0.8, 1.2, 0],
          [0.2, 0.1, 2],
          0xff9b24,
        );
        stripe.material.emissive.set(0xff7419);
        stripe.material.emissiveIntensity = 0.7;
      }
      part(
        bumper,
        new THREE.SphereGeometry(0.48, 12, 8),
        0xfff2cd,
        [0, 1.42, 0],
      );
      // Warning chevrons give time to choose the open lane. No flashing.
      for (let j = 1; j <= 3; j++) {
        const warning = this.track.sample(o.distance - j * 12, o.lane);
        const tile = box(
          this.group,
          [warning.position.x, warning.roadY + 0.04, warning.position.z],
          [2.8, 0.08, 1],
          0xffdc88,
        );
        tile.rotation.y = warning.heading;
      }
      bumper.name = "soft-race-bumper";
      this.group.add(bumper);
    });
    this.track.jumps.forEach((j, i) => {
      const s = this.track.sample(j.start - 12),
        gate = new THREE.Group();
      gate.position.copy(s.position);
      gate.rotation.y = s.heading;
      for (const side of [-1, 1])
        box(gate, [side * 9.6, 5.8, 0], [0.8, 11.6, 0.8], RACE_COLORS[i]);
      box(gate, [0, 11.4, 0], [20, 0.8, 0.8], RACE_COLORS[i]);
      if (globalThis.document) {
        const sign = label(
          gate,
          `JUMP ${i + 1} · READY!`,
          0,
          10,
          0.6,
          13,
          "#193347",
          "#fff2ce",
        );
        sign.rotation.y = Math.PI;
      }
      this.group.add(gate);
    });
    const start = this.track.sample(0),
      gate = new THREE.Group();
    gate.position.copy(start.position);
    gate.rotation.y = start.heading;
    for (const side of [-1, 1])
      box(gate, [side * 11, 5, 0], [1, 10, 1], 0x8adfd4);
    box(gate, [0, 9.7, 0], [23, 1.3, 1], 0x8adfd4);
    for (let x = -9; x <= 9; x += 2)
      for (let z = -1; z <= 1; z += 2)
        box(
          gate,
          [x, 0.03, z],
          [2, 0.06, 2],
          ((x + 9) / 2 + (z + 1) / 2) % 2 ? 0xeff3df : 0x203047,
        );
    if (globalThis.document) {
      const sign = label(
        gate,
        "MOONBEAM RALLY · START / FINISH",
        0,
        9.6,
        0.7,
        21,
        "#143544",
        "#fff1c4",
      );
      sign.rotation.y = Math.PI;
    }
    this.group.add(gate);
  }
  buildStation() {
    box(this.group, [-133, 0.04, 80], [35, 0.08, 35], 0x526277);
    this.trophy = new THREE.Group();
    this.trophy.name = "earned-moonbeam-trophy";
    this.trophy.position.set(-127, 1.1, 72);
    this.group.add(this.trophy);
    box(this.group, [-127, 0.5, 72], [3, 1, 3], 0x28394f);
    part(
      this.trophy,
      new THREE.CylinderGeometry(0.75, 0.95, 0.25, 24),
      0xd7a84f,
      [0, 0.1, 0],
    );
    part(
      this.trophy,
      new THREE.CylinderGeometry(0.17, 0.25, 1, 16),
      0xffd478,
      [0, 0.7, 0],
    );
    part(
      this.trophy,
      new THREE.CylinderGeometry(0.95, 0.32, 1.3, 32, 1, true),
      0xffd478,
      [0, 1.5, 0],
    );
    for (const side of [-1, 1])
      part(this.trophy, new THREE.TorusGeometry(0.55, 0.1, 8, 24), 0xffd478, [
        side * 0.8,
        1.55,
        0,
      ]);
    this.trophy.visible = this.wins > 0;
    if (globalThis.document) {
      label(
        this.group,
        "MOONBEAM RALLY",
        -135,
        6.2,
        90,
        22,
        "#143544",
        "#aff3dc",
      );
      label(
        this.group,
        "STEP HERE · E TO RACE",
        RACE_ENTRY.x,
        1.7,
        RACE_ENTRY.z,
        8,
        "#143544",
        "#fff1c4",
      );
      label(
        this.group,
        "1ST PLACE · YOUR TROPHY",
        -127,
        4,
        72,
        7,
        "#143544",
        "#ffe0a2",
      );
      label(
        this.group,
        "← MOONBEAM RALLY",
        -45,
        2,
        76,
        9,
        "#143544",
        "#aff3dc",
      );
    }
    for (let x = -55; x >= -125; x -= 10)
      part(this.group, new THREE.SphereGeometry(0.24, 8, 6), 0xb0f7da, [
        x,
        0.27,
        80,
      ]);
  }
  buildHUD() {
    if (!globalThis.document) return;
    this.hud = document.createElement("section");
    this.hud.className = "race-hud";
    this.hud.hidden = true;
    this.hud.setAttribute("aria-label", "Moonbeam Rally race controls");
    this.hud.innerHTML =
      '<span class="race-eyebrow">MOONBEAM RALLY / PLASMA GP</span><strong class="race-phase" role="status"></strong><p class="race-info"></p><progress class="race-progress" max="100" value="0" aria-label="Race progress"></progress><button class="race-power" disabled>Collect a power-up</button><p class="race-help"><span class="race-help-keys">A/D steer · W accelerate · S brake · F power-up.</span><span class="race-help-touch">Thumbstick steers; down brakes. Tap your power-up to use it.</span> Cyan arrows boost. Amber grids slow. Meteor circles warn before impact. Jumps are automatic.</p><button class="race-options" aria-expanded="false" aria-controls="race-actions">Controls</button><div class="race-actions" id="race-actions"><button class="race-start">Start race · E</button><button class="race-auto" aria-pressed="true">Auto-accelerate</button><button class="race-gentle" aria-pressed="false">Gentler motion</button><button class="race-exit">Exit safely</button></div>';
    document.querySelector("#game").append(this.hud);
    this.phaseText = this.hud.querySelector(".race-phase");
    this.info = this.hud.querySelector(".race-info");
    this.progress = this.hud.querySelector("progress");
    const act = (selector, fn) =>
      (this.hud.querySelector(selector).onclick = () => {
        if (this.game.mode === "playing") {
          fn();
          this.updateHUD();
          this.game.canvas.focus();
        }
      });
    act(".race-start", () => this.start());
    act(".race-power", () => {
      if (this.run.usePowerup()) this.game.ui.toast(this.run.notice);
    });
    act(".race-exit", () => this.exit());
    act(".race-auto", () => {
      this.autoThrottle = !this.autoThrottle;
    });
    act(".race-gentle", () => {
      this.gentle = !this.gentle;
    });
    act(".race-options", () => {
      this.optionsExpanded = !this.optionsExpanded;
    });
  }
  board() {
    const g = this.game;
    if (
      this.occupied ||
      g.mode !== "playing" ||
      g.area.id !== "space" ||
      g.player.inVehicle
    )
      return false;
    g.pickups?.reset();
    g.player.model.animator?.reset();
    this.savedParent = g.player.model.parent;
    this.savedBones = [];
    g.player.model.traverse((n) => {
      if (n.isBone) this.savedBones.push([n, n.quaternion.clone()]);
    });
    this.savedCamera = { fov: g.camera.fov, far: g.camera.far };
    this.occupied = true;
    this.run.reset();
    this.resultShown = false;
    this.cameraReady = false;
    this.optionsExpanded = false;
    g.player.inVehicle = true;
    g.player.velocity.set(0, 0);
    g.player.velocityY = 0;
    g.player.actualSpeed = 0;
    this.karts[0].add(g.player.model);
    g.player.model.position.set(0, 0.48, -0.55);
    g.player.model.rotation.set(0, 0, 0);
    g.player.model.visible = true;
    seated(g.player.model);
    this.autoThrottle = true;
    this.gentle = !!g.calm;
    g.input.clear();
    g.ui.showPrompt(null);
    this.placeKarts();
    this.updateHUD();
    if (globalThis.document) {
      document.querySelector("#cowboy-controls").hidden = true;
      document.querySelector("#robot-gestures").hidden = true;
    }
    g.ui.toast(
      "Two laps. Cyan boosts, amber stoppers, fire rings and meteor warnings. Collect a capsule, then press F or tap it.",
    );
    g.canvas?.focus();
    return true;
  }
  start() {
    if (!this.occupied || this.game.mode !== "playing") return;
    if (this.run.state === "finished") {
      this.run.reset();
      this.resultShown = false;
      this.cameraReady = false;
    }
    if (this.run.start()) {
      this.optionsExpanded = false;
      this.game.input.clear();
      this.game.audio?.oneShot("confirm", 0.16);
      this.placeKarts();
    }
  }
  placeKarts() {
    this.run.racers.forEach((r, i) => {
      const finished = this.run.state === "finished";
      const s = this.track.sample(
        finished ? 0 : r.distance,
        finished ? [-0, -5, 5][i] : r.lane,
      );
      const k = this.karts[i];
      // Retire finished rivals until the podium instead of leaving ghosts on the line.
      k.visible = finished || r.finish === null;
      k.position.copy(s.position);
      k.position.y += 0.85 + (finished ? 0 : s.lift);
      k.rotation.set(-(finished ? 0 : s.pitch), s.heading, 0, "YXZ");
      k.userData.flames.visible =
        this.occupied && this.run.state === "racing" && r.speed > 2;
      k.userData.flames.scale.z = r.boost > 0 ? 1.7 : 1;
      k.userData.shield.visible = this.occupied && r.shield > 0;
    });
    if (this.occupied) {
      this.game.player.position.copy(this.karts[0].position);
      this.game.player.position.y += this.game.areas.space.groundY;
      this.game.player.model.visible = true;
    }
  }
  updateRacerVisibility() {
    const g = this.game;
    const show =
      this.occupied ||
      (g.area.id === "space" &&
        Math.hypot(
          g.player.position.x - RACE_ENTRY.x,
          g.player.position.z - RACE_ENTRY.z,
        ) <= RACER_DETAIL_DISTANCE);
    for (const alien of this.aliens) alien.visible = show;
  }
  update(dt) {
    const g = this.game;
    if (this.hud) this.hud.hidden = !this.occupied || g.mode !== "playing";
    this.updateRacerVisibility();
    if (g.area.id === "space")
      this.effects.update(
        this.run,
        g.player.position,
        g.area.groundY,
        this.gentle || g.calm,
        this.occupied,
      );
    if (!this.occupied || g.mode !== "playing") return;
    if (g.input.consume("KeyE")) {
      if (this.run.state === "ready" || this.run.state === "finished")
        this.start();
      else {
        this.exit();
        return;
      }
    }
    const input = g.input;
    this.run.update(dt, {
      steer:
        Number(input.down("KeyD", "ArrowRight")) -
        Number(input.down("KeyA", "ArrowLeft")),
      throttle: this.autoThrottle || input.down("KeyW", "ArrowUp"),
      brake: input.down("KeyS", "ArrowDown"),
      gentle: this.gentle || g.calm,
      usePowerup: input.consume("KeyF"),
    });
    if (this.run.notice) g.ui.toast(this.run.notice);
    if (this.run.state === "finished" && !this.resultShown) {
      this.resultShown = true;
      this.cameraReady = false;
      if (this.run.place === 1) {
        this.wins++;
        this.trophy.visible = true;
        try {
          globalThis.localStorage?.setItem(
            "crews-place-moonbeam-trophies",
            String(this.wins),
          );
        } catch {}
        g.audio?.oneShot("confirm", 0.22);
        g.ui.toast("First place! Your Moonbeam trophy is on the stand.");
      } else
        g.ui.toast(
          "Finish line! You completed the whole course. Race again whenever you like.",
        );
    }
    this.placeKarts();
    this.updateHUD();
  }
  updateHUD() {
    if (!this.hud) return;
    this.hud.hidden = !this.occupied || this.game.mode !== "playing";
    const state = this.run.state,
      r = this.run.racers[0],
      place = ["", "1st", "2nd", "3rd"][this.run.place];
    const racing = state === "racing" || state === "countdown";
    this.hud.dataset.raceState = racing ? "racing" : state;
    const options = this.hud.querySelector(".race-options");
    const actions = this.hud.querySelector(".race-actions");
    options.hidden = !racing;
    options.setAttribute(
      "aria-expanded",
      String(racing && this.optionsExpanded),
    );
    options.textContent = this.optionsExpanded ? "Hide controls" : "Controls";
    actions.hidden = racing && !this.optionsExpanded;
    const title =
      state === "ready"
        ? "Ready when you are"
        : state === "countdown"
          ? `Starting in ${Math.ceil(this.run.countdown)}`
          : state === "finished"
            ? this.run.place === 1
              ? "1st place · Trophy earned!"
              : `${place} place · Course complete!`
            : `${place} place · ${this.track.sample(r.distance).lift > 1 ? "Moon jump!" : "Follow the stars"}`;
    if (this.phaseText.textContent !== title)
      this.phaseText.textContent = title;
    this.info.textContent =
      state === "ready"
        ? "2 laps · 7.8 km · 8 huge jumps · 24 fire rings · Win a trophy"
        : `Lap ${Math.min(RACE_LAPS, 1 + Math.floor(r.distance / this.track.length))}/${RACE_LAPS} · ${Math.round(r.speed * 3.6 * (this.gentle || this.game.calm ? 0.7 : 1))} km/h · Rings ${r.rings}/24 · ${Math.floor(this.run.elapsed / 60)}:${String(Math.floor(this.run.elapsed % 60)).padStart(2, "0")}`;
    this.progress.value = (r.distance / this.track.raceDistance) * 100;
    const power = this.hud.querySelector(".race-power");
    power.hidden = state !== "racing";
    power.disabled = !r.powerup;
    power.textContent = r.powerup
      ? `Use ${r.powerup.toUpperCase()} · F`
      : r.shield > 0
        ? "Shield active"
        : "Collect a power-up";
    const start = this.hud.querySelector(".race-start");
    start.hidden = state !== "ready" && state !== "finished";
    start.textContent =
      state === "finished" ? "Race again · E" : "Start race · E";
    this.hud
      .querySelector(".race-auto")
      .setAttribute("aria-pressed", String(this.autoThrottle));
    this.hud
      .querySelector(".race-gentle")
      .setAttribute("aria-pressed", String(this.gentle || this.game.calm));
  }
  updateCamera(dt) {
    const g = this.game,
      k = this.karts[0],
      s = this.track.sample(
        this.run.state === "finished" ? 0 : this.run.racers[0].distance,
      );
    const target = k.position.clone().add(v(0, g.areas.space.groundY + 1, 0));
    const speedRatio = this.run.racers[0].speed / RACE_BOOST_SPEED;
    const desired = target
      .clone()
      .addScaledVector(s.tangent, -(11.5 + speedRatio * 2))
      .add(v(0, 5.8, 0));
    if (!this.cameraReady) g.camera.position.copy(desired);
    else
      g.camera.position.lerp(
        desired,
        1 - Math.exp(-(this.gentle || g.calm ? 3 : 7) * dt),
      );
    g.camera.up.set(0, 1, 0);
    g.camera.lookAt(target.clone().addScaledVector(s.tangent, 10));
    g.camera.fov = THREE.MathUtils.damp(
      g.camera.fov,
      this.gentle || g.calm ? 62 : 64 + speedRatio * 10,
      3,
      dt,
    );
    g.camera.far = Math.max(g.camera.far, 2200);
    g.camera.updateProjectionMatrix();
    this.cameraReady = true;
    g.input.lookX = g.input.lookY = 0;
  }
  exit() {
    if (!this.occupied) return;
    const g = this.game;
    this.savedParent.add(g.player.model);
    for (const [n, q] of this.savedBones) n.quaternion.copy(q);
    g.player.model.rotation.set(0, 0, 0);
    g.player.inVehicle = false;
    g.player.model.visible = true;
    g.player.heading = 0;
    this.occupied = false;
    this.run.reset();
    this.placeKarts();
    g.player.teleport(RACE_ENTRY.x, RACE_ENTRY.z, g.areas.space.groundY);
    g.camera.up.set(0, 1, 0);
    g.camera.fov = this.savedCamera.fov;
    g.camera.far = this.savedCamera.far;
    g.camera.updateProjectionMatrix();
    g.follow.reset(Math.PI / 2);
    g.input.clear();
    g.interactionCooldown = 0.6;
    g.refreshCharacterUI?.();
    this.updateHUD();
    g.canvas?.focus();
  }
}
