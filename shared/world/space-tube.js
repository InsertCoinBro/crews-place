import * as THREE from "three";
import { label, box } from "./models.js";
import {
  createSpaceTubeTrack,
  SpaceTubeRide,
  TUBE_ENTRY,
  TUBE_EXIT,
  TUBE_RADIUS,
  TUBE_DURATION,
} from "./space-tube-track.js";

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const colors = [0x6ff5f1, 0x6db4ff, 0xcc9fff, 0xffa2dc];

export class SpaceTube {
  constructor(game) {
    this.game = game;
    this.track = createSpaceTubeTrack();
    this.ride = new SpaceTubeRide(this.track);
    this.group = new THREE.Group();
    this.group.name = "Starlight Slipstream tube ride";
    game.areas.space.group.add(this.group);
    this.carrier = new THREE.Group();
    this.carrier.name = "belly-down-tube-rider";
    this.group.add(this.carrier);
    this.view = "follow";
    this.time = 0;
    this.build();
    this.buildHUD();
    game.interactions.register({
      id: "space-tube",
      kind: "space-tube",
      area: "space",
      x: TUBE_ENTRY.x - 4,
      y: game.areas.space.groundY,
      z: TUBE_ENTRY.z,
      radius: 4,
      label: "Ride Starlight Slipstream",
      hint: "E · Suction launch · 60-second tube adventure",
    });
    game.interactions.on("space-tube", () => this.board());
  }
  get occupied() {
    return this.ride.state !== "waiting";
  }
  build() {
    // Split the clear shell for local transparency sorting along this long tube.
    const segments = 48;
    for (let i = 0; i < segments; i++) {
      const path = new THREE.CatmullRomCurve3(
        Array.from(
          { length: 33 },
          (_, j) =>
            this.track.sample(((i + j / 32) / segments) * this.track.length)
              .position,
        ),
      );
      const material = new THREE.MeshStandardMaterial({
        color: colors[Math.floor(i / 6) % 4],
        transparent: true,
        opacity: 0.13,
        roughness: 0.22,
        metalness: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false,
      });
      material.forceSinglePass = true;
      const shell = new THREE.Mesh(
        new THREE.TubeGeometry(path, 32, TUBE_RADIUS, 12, false),
        material,
      );
      shell.name = "transparent-air-tube";
      this.group.add(shell);
    }
    const count = Math.floor(this.track.length / 11) + 1;
    this.ribs = new THREE.InstancedMesh(
      new THREE.TorusGeometry(TUBE_RADIUS, 0.065, 6, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }),
      count,
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const s = this.track.sample((i / (count - 1)) * this.track.length);
      dummy.position.copy(s.position);
      dummy.quaternion.copy(s.rotation);
      dummy.updateMatrix();
      this.ribs.setMatrixAt(i, dummy.matrix);
      this.ribs.setColorAt(i, new THREE.Color(colors[Math.floor(i / 8) % 4]));
    }
    this.ribs.name = "colored-tube-hoops";
    this.group.add(this.ribs);
    this.air = new THREE.InstancedMesh(
      new THREE.TorusGeometry(TUBE_RADIUS - 0.18, 0.025, 4, 20),
      new THREE.MeshBasicMaterial({
        color: 0xd6ffff,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        fog: false,
      }),
      32,
    );
    this.air.name = "airflow-rings";
    this.group.add(this.air);
    this.air.frustumCulled = false;
    const pad = box(this.group, 156, 0.06, 43, 27, 0.12, 34, 0x1d3552);
    pad.name = "slipstream-boarding-plaza";
    for (const [distance, text, color] of [
      [0, "IN", 0x70fff1],
      [this.track.length, "OUT", 0xffc588],
    ]) {
      const s = this.track.sample(distance);
      const mouth = new THREE.Mesh(
        new THREE.CylinderGeometry(4, TUBE_RADIUS, 4, 40, 1, true),
        new THREE.MeshStandardMaterial({
          color,
          metalness: 0.4,
          roughness: 0.3,
          side: THREE.DoubleSide,
        }),
      );
      mouth.position
        .copy(s.position)
        .addScaledVector(s.tangent, distance ? 2 : -2);
      mouth.quaternion.setFromUnitVectors(
        v(0, 1, 0),
        s.tangent.clone().multiplyScalar(distance ? 1 : -1),
      );
      this.group.add(mouth);
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(4, 0.15, 8, 48),
        new THREE.MeshBasicMaterial({ color, fog: false }),
      );
      halo.position
        .copy(s.position)
        .addScaledVector(s.tangent, distance ? 4 : -4);
      halo.quaternion.copy(s.rotation);
      this.group.add(halo);
    }
    // A few slender masts make the extreme scale legible from the ground.
    for (const [x, h, z] of [
      [250, 288, -20],
      [365, 87, 65],
      [455, 97, 110],
      [500, 125, 240],
    ]) {
      box(this.group, x, h / 2, z, 1.5, h, 1.5, 0x43577a);
      box(this.group, x, 0.12, z, 8, 0.24, 8, 0x38516d);
      this.game.areas.space.colliders.push({
        minX: x - 1,
        maxX: x + 1,
        minZ: z - 1,
        maxZ: z + 1,
        minY: this.game.areas.space.groundY,
        maxY: this.game.areas.space.groundY + h,
      });
    }
    if (globalThis.document) {
      label(
        this.group,
        "STARLIGHT SLIPSTREAM",
        156,
        8,
        52,
        22,
        "#152e4e",
        "#91fff0",
      );
      label(
        this.group,
        "60 SECONDS · LOOPS · TRIPLE CORKSCREW",
        156,
        5.7,
        52,
        16,
        "#152e4e",
        "#ffe2ab",
      );
      label(
        this.group,
        "STEP HERE · E TO RIDE",
        151,
        1.7,
        38,
        6,
        "#17374e",
        "#9affeb",
      );
      label(this.group, "SLIPSTREAM →", 57, 2, 28, 6, "#17374e", "#9affeb");
    }
    // Flat approach lights connect the space hub with the east-side entrance.
    for (let x = 65; x < 146; x += 10) {
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0x8dfff3 }),
      );
      light.position.set(x, 0.3, 35);
      this.group.add(light);
    }
    this.updateAir(0);
  }
  buildHUD() {
    if (!globalThis.document) return;
    this.hud = document.createElement("section");
    this.hud.className = "tube-hud";
    this.hud.hidden = true;
    this.hud.setAttribute("aria-label", "Starlight Slipstream ride controls");
    this.hud.innerHTML =
      '<span>STARLIGHT SLIPSTREAM</span><strong class="tube-phase" role="status">Air launch</strong><p class="tube-stats"></p><div><button class="tube-view">Side view · C</button><button class="tube-gentle" aria-pressed="false">Gentler motion</button><button class="tube-exit">Exit safely · E</button></div>';
    document.querySelector("#game").append(this.hud);
    this.hud.querySelector(".tube-view").onclick = () => {
      if (this.game.mode === "playing") this.toggleView();
    };
    this.hud.querySelector(".tube-gentle").onclick = () => {
      if (this.game.mode === "playing") {
        this.gentle = !this.gentle;
        this.updateHUD();
        this.game.canvas.focus();
      }
    };
    this.hud.querySelector(".tube-exit").onclick = () => {
      if (this.game.mode === "playing") this.exit();
    };
  }
  board() {
    const g = this.game;
    if (
      this.occupied ||
      g.mode !== "playing" ||
      g.area.id !== "space" ||
      g.player.inVehicle ||
      g.playground?.active
    )
      return false;
    g.pickups?.reset();
    g.player.model.animator?.reset();
    g.player.model.animator?.mixer.update(0);
    this.savedParent = g.player.model.parent;
    this.savedQuaternion = g.player.model.quaternion.clone();
    this.savedBones = [];
    g.player.model.traverse((n) => {
      if (n.isBone) this.savedBones.push([n, n.quaternion.clone()]);
    });
    this.carrier.add(g.player.model);
    // Upright avatar's +Y points head-first down the tube; its face (+Z)
    // rotates toward the tube floor (-Y), making a true stomach-down pose.
    g.player.model.rotation.set(Math.PI / 2, 0, 0);
    g.player.model.position.set(0, 0, -1.1);
    g.player.model.visible = true;
    g.player.inVehicle = true;
    g.player.velocity.set(0, 0);
    g.player.velocityY = 0;
    g.player.actualSpeed = 0;
    this.savedCamera = { far: g.camera.far, fov: g.camera.fov };
    g.camera.far = Math.max(g.camera.far, 2200);
    g.camera.updateProjectionMatrix();
    this.gentle = !!g.calm;
    this.cameraReady = false;
    this.view = "follow";
    this.ride.launch();
    this.placeRider();
    this.poseRider();
    g.input.clear();
    g.ui.showPrompt(null);
    if (globalThis.document) {
      document.querySelector("#cowboy-controls").hidden = true;
      document.querySelector("#robot-gestures").hidden = true;
    }
    g.audio?.oneShot("confirm", 0.15);
    g.ui.toast("Whoosh! Let the air carry you. E returns you safely anytime.");
    g.canvas?.focus();
    this.updateHUD();
    return true;
  }
  poseRider() {
    // Reach forward like a belly-first body slide. Use world-space bone
    // directions so the cowboy, robot and alien rigs share the same pose.
    const model = this.game.player.model;
    const bone = (...names) =>
      names.map((n) => model.getObjectByName(n)).find(Boolean);
    for (const side of ["L", "R"]) {
      const upper = bone("DEF-upper_arm" + side, "UpperArm" + side);
      const lower = bone("DEF-forearm" + side, "Forearm" + side);
      const hand = bone("DEF-hand" + side, "Hand" + side);
      if (!upper || !lower || !hand) continue;
      for (const [joint, child, spread] of [
        [upper, lower, 0.18],
        [lower, hand, 0.05],
      ]) {
        model.updateWorldMatrix(true, true);
        const from = child
          .getWorldPosition(v())
          .sub(joint.getWorldPosition(v()))
          .normalize();
        const to = v(side === "L" ? spread : -spread, 1, 0.08)
          .normalize()
          .transformDirection(model.matrixWorld);
        const world = joint
          .getWorldQuaternion(new THREE.Quaternion())
          .premultiply(new THREE.Quaternion().setFromUnitVectors(from, to));
        joint.quaternion.copy(
          joint.parent
            .getWorldQuaternion(new THREE.Quaternion())
            .invert()
            .multiply(world),
        );
      }
    }
    model.updateWorldMatrix(true, true);
  }
  toggleView() {
    this.view = this.view === "follow" ? "side" : "follow";
    this.updateHUD();
    this.game.canvas?.focus();
  }
  placeRider() {
    const s = this.track.sample(this.ride.distance);
    this.carrier.position.copy(s.position);
    this.carrier.quaternion.copy(s.rotation);
    this.game.player.position.copy(s.position);
    this.game.player.position.y += this.game.areas.space.groundY;
    this.game.player.model.visible = true;
  }
  updateAir(dt) {
    this.time += dt;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 32; i++) {
      const d =
          ((i / 32) * this.track.length +
            this.time * (this.occupied ? 55 : 6)) %
          this.track.length,
        s = this.track.sample(d);
      dummy.position.copy(s.position);
      dummy.quaternion.copy(s.rotation);
      dummy.updateMatrix();
      this.air.setMatrixAt(i, dummy.matrix);
    }
    this.air.instanceMatrix.needsUpdate = true;
  }
  update(dt) {
    const g = this.game;
    if (this.hud) this.hud.hidden = !this.occupied || g.mode !== "playing";
    if (g.mode !== "playing" || g.area.id !== "space") return;
    const calm = this.gentle || g.calm;
    this.updateAir(calm ? 0 : dt);
    if (!this.occupied) return;
    if (g.input.consume("KeyE")) {
      this.exit();
      return;
    }
    if (g.input.consume("KeyC")) this.toggleView();
    this.ride.update(dt, calm);
    this.placeRider();
    this.updateHUD();
    if (this.ride.state === "arrived") {
      this.exit();
      g.ui.toast(
        "Touchdown! You rode every loop. Come back whenever you like.",
      );
    }
  }
  updateHUD() {
    if (!this.hud) return;
    this.hud.hidden = !this.occupied || this.game.mode !== "playing";
    const t = this.ride.elapsed,
      s = this.track.sample(this.ride.distance);
    const phase =
      t < 4
        ? "Suction launch"
        : s.position.y > 270
          ? "Top of the stars"
          : s.tangent.y < -0.65
            ? "The giant dive"
            : t > 52
              ? "Air cushion · slowing down"
              : "Loops, twists & rushing air";
    const title = this.hud.querySelector(".tube-phase");
    if (title.textContent !== phase) title.textContent = phase;
    this.hud.querySelector(".tube-stats").textContent =
      `${Math.round(s.position.y)} m above the moon · ${Math.round(this.ride.speed * 3.6)} km/h · ${Math.round((this.ride.elapsed / TUBE_DURATION) * 100)}%`;
    this.hud.querySelector(".tube-view").textContent =
      this.view === "follow" ? "Side view · C" : "Follow view · C";
    this.hud
      .querySelector(".tube-gentle")
      .setAttribute("aria-pressed", String(this.gentle || this.game.calm));
  }
  updateCamera(dt) {
    const g = this.game,
      s = this.track.sample(this.ride.distance),
      calm = this.gentle || g.calm;
    const target = s.position.clone();
    target.y += g.areas.space.groundY;
    const up = calm ? v(0, 1, 0) : s.up;
    const desired = target
      .clone()
      .addScaledVector(s.tangent, -9)
      .addScaledVector(s.right, this.view === "side" ? 11 : 5)
      .addScaledVector(up, 5);
    if (!this.cameraReady) {
      g.camera.position.copy(desired);
      g.camera.up.copy(up);
    } else {
      g.camera.position.lerp(desired, 1 - Math.exp(-(calm ? 3 : 9) * dt));
      g.camera.up.lerp(up, 1 - Math.exp(-5 * dt)).normalize();
    }
    g.camera.lookAt(target);
    g.camera.fov = THREE.MathUtils.damp(g.camera.fov, calm ? 55 : 65, 3, dt);
    g.camera.updateProjectionMatrix();
    this.cameraReady = true;
    g.player.model.visible = true;
    g.input.lookX = g.input.lookY = 0;
  }
  exit() {
    if (!this.occupied) return;
    const g = this.game;
    this.savedParent.add(g.player.model);
    for (const [bone, q] of this.savedBones) bone.quaternion.copy(q);
    g.player.model.quaternion.copy(this.savedQuaternion);
    this.ride.reset();
    g.player.inVehicle = false;
    g.player.model.visible = true;
    g.player.heading = 0;
    g.player.teleport(TUBE_EXIT.x, TUBE_EXIT.z, g.areas.space.groundY);
    g.camera.up.set(0, 1, 0);
    g.camera.fov = this.savedCamera.fov;
    g.camera.far = this.savedCamera.far;
    g.camera.updateProjectionMatrix();
    g.follow.reset(Math.PI);
    g.input.clear();
    g.interactionCooldown = 0.6;
    g.refreshCharacterUI?.();
    this.updateHUD();
    g.canvas?.focus();
  }
}
