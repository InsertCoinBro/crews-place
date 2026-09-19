import * as THREE from "three";
import { label } from "./models.js";

export const SHIP_DOCK = Object.freeze({ x: 31, z: -31 });
export const SHIP_EXIT = Object.freeze({ x: 25, z: -27 });

export function createSpaceship() {
  const ship = new THREE.Group();
  ship.name = "Starlight Explorer spaceship";
  const mesh = (geometry, color, position, scale = [1, 1, 1]) => {
    const m = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color,
        metalness: 0.45,
        roughness: 0.3,
      }),
    );
    m.position.set(...position);
    m.scale.set(...scale);
    m.castShadow = true;
    ship.add(m);
    return m;
  };
  mesh(
    new THREE.SphereGeometry(1, 32, 20),
    0xe4f2fa,
    [0, 0.75, 0],
    [2.35, 0.55, 3.3],
  );
  mesh(
    new THREE.SphereGeometry(1, 24, 16),
    0x294d70,
    [0, 0.48, -0.2],
    [2.4, 0.28, 2.5],
  );
  for (const side of [-1, 1]) {
    const wing = mesh(new THREE.BoxGeometry(2.5, 0.2, 2.7), 0x54c9d6, [
      side * 2.35,
      0.8,
      -0.6,
    ]);
    wing.rotation.y = side * 0.3;
    const engine = mesh(
      new THREE.CylinderGeometry(0.58, 0.58, 2.3, 20),
      0x344865,
      [side * 2.35, 0.9, -1.8],
    );
    engine.rotation.x = Math.PI / 2;
    const nozzle = mesh(new THREE.TorusGeometry(0.44, 0.12, 10, 24), 0xa1edf5, [
      side * 2.35,
      0.9,
      -3,
    ]);
    nozzle.material.emissive.set(0x208899);
    mesh(new THREE.BoxGeometry(0.22, 0.4, 2.3), 0x29354e, [
      side * 1.6,
      0.12,
      0,
    ]);
  }
  mesh(new THREE.BoxGeometry(1, 0.25, 0.85), 0x253754, [0, 1.15, -0.5]);
  mesh(new THREE.BoxGeometry(1, 0.95, 0.2), 0x365b7b, [0, 1.62, -0.9]);
  mesh(new THREE.BoxGeometry(1.2, 0.2, 0.45), 0x43d4d0, [0, 1.55, 0.8]);
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: 0x9be8ff,
      transparent: true,
      opacity: 0.18,
      roughness: 0.08,
      metalness: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  glass.name = "clear-bubble-cockpit";
  glass.position.set(0, 1.1, -0.1);
  glass.scale.set(1.5, 2.15, 1.95);
  glass.renderOrder = 3;
  ship.add(glass);
  const rim = mesh(
    new THREE.TorusGeometry(1, 0.055, 8, 64),
    0xf7c76a,
    [0, 1.1, -0.1],
    [1.5, 1.95, 1],
  );
  rim.rotation.x = Math.PI / 2;
  const flames = new THREE.Group();
  flames.name = "rear-rocket-boosters";
  ship.add(flames);
  for (const side of [-1, 1])
    for (const core of [false, true]) {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(core ? 0.22 : 0.4, core ? 1.7 : 2.6, 16),
        new THREE.MeshBasicMaterial({
          color: core ? 0xe5ffff : 0x37cfff,
          transparent: true,
          opacity: core ? 0.95 : 0.65,
          depthWrite: false,
        }),
      );
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(side * 2.35, 0.9, core ? -3.75 : -4.1);
      flames.add(flame);
    }
  flames.visible = false;
  ship.userData.flames = flames;
  return ship;
}

export class Spaceship {
  constructor(game) {
    this.game = game;
    this.occupied = false;
    this.phase = "parked";
    this.heading = 0;
    this.speed = 0;
    this.time = 0;
    this.model = createSpaceship();
    game.scene.add(this.model);
    this.model.visible = false;
    this.home = new THREE.Vector3(
      SHIP_DOCK.x,
      game.areas.space.groundY + 0.3,
      SHIP_DOCK.z,
    );
    this.model.position.copy(this.home);
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 6, 0.16, 48),
      new THREE.MeshStandardMaterial({
        color: 0x263d60,
        metalness: 0.35,
        roughness: 0.6,
      }),
    );
    pad.position.set(SHIP_DOCK.x, 0.05, SHIP_DOCK.z);
    game.areas.space.group.add(pad);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(5.5, 0.07, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0x81edee }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(SHIP_DOCK.x, 0.16, SHIP_DOCK.z);
    game.areas.space.group.add(ring);
    if (globalThis.document)
      label(
        game.areas.space.group,
        "STARLIGHT EXPLORER",
        31,
        2,
        -36,
        7,
        "#17304f",
        "#9ff5ee",
      );
    if (globalThis.document)
      label(
        game.areas.space.group,
        "BOARD HERE · E",
        SHIP_EXIT.x,
        1.3,
        SHIP_EXIT.z,
        3.8,
        "#17304f",
        "#ffffff",
      );
    this.collider = {
      minX: 27,
      maxX: 35,
      minZ: -34.5,
      maxZ: -27.5,
      minY: game.areas.space.groundY,
      maxY: game.areas.space.groundY + 3.5,
    };
    game.areas.space.colliders.push(this.collider);
    game.interactions.register({
      id: "spaceship",
      kind: "spaceship",
      area: "space",
      x: SHIP_EXIT.x,
      y: game.areas.space.groundY,
      z: SHIP_EXIT.z,
      radius: 3,
      label: "Fly the Starlight Explorer",
      hint: "E to board · Glass cockpit · Return safely anytime",
    });
    game.interactions.on("spaceship", () => this.board());
    if (globalThis.document) {
      this.hud = document.createElement("aside");
      this.hud.className = "spaceship-hud";
      this.hud.hidden = true;
      this.hud.innerHTML =
        '<strong>Starlight Explorer</strong><p>W/S fly · A/D steer · Space rise · C lower</p><p class="ship-status" role="status"></p><button type="button">Return and land · E</button>';
      document.querySelector("#game").append(this.hud);
      this.hud.querySelector("button").onclick = () => this.requestReturn();
    }
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
    this.savedParent = g.player.model.parent;
    this.occupied = true;
    this.phase = "flying";
    this.speed = 0;
    this.heading = 0;
    this.cameraReady = false;
    this.viewAngle = 0.5;
    g.player.inVehicle = true;
    g.player.velocity.set(0, 0);
    g.player.velocityY = 0;
    g.player.model.animator?.reset();
    this.model.add(g.player.model);
    g.player.model.position.set(0, 0.48, -0.35);
    g.player.model.rotation.set(0, 0, 0);
    g.player.model.visible = true;
    this.savedBones = [];
    g.player.model.traverse((n) => {
      if (!n.isBone) return;
      this.savedBones.push([n, n.quaternion.clone()]);
      if (/DEF-thigh[LR]$|thigh[._-]?[LR]$/i.test(n.name))
        n.rotation.x = -Math.PI / 2;
      if (/DEF-shin[LR]$|shin[._-]?[LR]$/i.test(n.name))
        n.rotation.x = Math.PI / 2;
    });
    g.input.clear();
    g.ui.showPrompt(null);
    if (globalThis.document) {
      document.querySelector("#cowboy-controls").hidden = true;
      document.querySelector("#robot-gestures").hidden = true;
    }
    g.ui.toast("Ready to fly! Space rises; E returns you safely to this dock.");
    g.canvas?.focus();
    return true;
  }
  requestReturn() {
    if (
      !this.occupied ||
      this.phase !== "flying" ||
      this.game.mode !== "playing"
    )
      return;
    this.phase = "returning";
    this.returnStage = "rise";
    this.speed = 0;
    this.game.input.clear();
    this.returnHeight = Math.max(
      this.game.areas.space.groundY + 45,
      ...this.game.areas.space.colliders.map((c) => (c.maxY ?? 0) + 6),
      this.model.position.y,
    );
  }
  exit() {
    if (!this.occupied) return;
    const g = this.game;
    this.savedParent.add(g.player.model);
    for (const [bone, q] of this.savedBones) bone.quaternion.copy(q);
    this.occupied = false;
    this.phase = "parked";
    this.model.position.copy(this.home);
    this.model.rotation.set(0, 0, 0);
    this.model.userData.flames.visible = false;
    this.speed = 0;
    g.player.inVehicle = false;
    g.player.model.visible = true;
    g.player.model.rotation.set(0, 0, 0);
    g.player.heading = 0;
    g.player.teleport(SHIP_EXIT.x, SHIP_EXIT.z, g.areas.space.groundY);
    g.input.clear();
    g.follow.reset(Math.PI);
    g.interactionCooldown = 0.6;
    g.refreshCharacterUI?.();
    if (this.hud) this.hud.hidden = true;
    g.canvas?.focus();
  }
  blocked(p) {
    return this.game.areas.space.colliders.some(
      (c) =>
        c !== this.collider &&
        p.y < c.maxY + 0.5 &&
        p.y + 3 > (c.minY ?? -Infinity) &&
        p.x > c.minX - 3.6 &&
        p.x < c.maxX + 3.6 &&
        p.z > c.minZ - 3.6 &&
        p.z < c.maxZ + 3.6,
    );
  }
  update(dt) {
    const g = this.game;
    this.model.visible = g.area.id === "space";
    if (this.hud) this.hud.hidden = !this.occupied || g.mode !== "playing";
    if (!this.occupied || g.mode !== "playing") return;
    dt = Math.min(0.05, Math.max(0, dt));
    this.time += dt;
    if (g.input.consume("KeyE")) this.requestReturn();
    const p = this.model.position,
      old = p.clone();
    if (this.phase === "returning") {
      const target =
        this.returnStage === "rise"
          ? new THREE.Vector3(p.x, this.returnHeight, p.z)
          : this.returnStage === "cruise"
            ? new THREE.Vector3(this.home.x, this.returnHeight, this.home.z)
            : this.home;
      const delta = target.clone().sub(p),
        distance = delta.length();
      if (this.returnStage === "cruise" && Math.hypot(delta.x, delta.z) > 0.1) {
        const desiredHeading = Math.atan2(delta.x, delta.z);
        this.heading +=
          Math.atan2(
            Math.sin(desiredHeading - this.heading),
            Math.cos(desiredHeading - this.heading),
          ) *
          (1 - Math.exp(-4 * dt));
        this.model.rotation.y = this.heading;
      }
      p.addScaledVector(
        delta.normalize(),
        Math.min(distance, dt * (this.returnStage === "cruise" ? 16 : 9)),
      );
      if (distance < 0.08) {
        if (this.returnStage === "rise") this.returnStage = "cruise";
        else if (this.returnStage === "cruise") this.returnStage = "land";
        else {
          this.exit();
          g.ui.toast("Landed! You can explore on foot or fly again.");
          return;
        }
      }
    } else {
      const input = g.input;
      const forward =
        Number(input.down("KeyW", "ArrowUp")) -
        Number(input.down("KeyS", "ArrowDown"));
      this.heading +=
        (Number(input.down("KeyA", "ArrowLeft")) -
          Number(input.down("KeyD", "ArrowRight"))) *
        dt *
        1.3;
      this.speed = THREE.MathUtils.damp(
        this.speed,
        forward * (g.calm ? 7 : 12),
        5,
        dt,
      );
      const candidate = p.clone();
      candidate.x += Math.sin(this.heading) * this.speed * dt;
      candidate.z += Math.cos(this.heading) * this.speed * dt;
      candidate.y +=
        (Number(input.down("Space")) - Number(input.down("KeyC"))) * dt * 7;
      const b = g.area.bounds;
      candidate.x = THREE.MathUtils.clamp(candidate.x, b.minX + 4, b.maxX - 4);
      candidate.z = THREE.MathUtils.clamp(candidate.z, b.minZ + 4, b.maxZ - 4);
      candidate.y = THREE.MathUtils.clamp(
        candidate.y,
        this.home.y,
        g.area.groundY + 55,
      );
      if (!this.blocked(candidate)) p.copy(candidate);
      else {
        this.speed = 0;
        const rise = p.clone();
        rise.y = candidate.y;
        if (!this.blocked(rise)) p.copy(rise);
      }
      this.model.rotation.y = this.heading;
    }
    this.model.userData.flames.visible = p.distanceToSquared(old) > 0.000001;
    this.model.userData.flames.scale.setScalar(
      g.calm ? 1 : 1 + Math.sin(this.time * 12) * 0.035,
    );
    g.player.position.copy(p);
    g.player.heading = this.heading;
    g.player.model.visible = true;
    if (this.hud) {
      const text =
        this.phase === "returning"
          ? "Returning to the northeast dock…"
          : `${Math.round(p.y - this.home.y)} m above the surface · E to return and land`;
      const status = this.hud.querySelector(".ship-status");
      if (status.textContent !== text) status.textContent = text;
      this.hud.querySelector("button").disabled = this.phase === "returning";
    }
  }
  updateCamera(dt) {
    const g = this.game;
    this.viewAngle -= g.input.lookX * 0.003;
    g.input.lookX = g.input.lookY = 0;
    const angle = this.heading + Math.PI + this.viewAngle,
      target = this.model.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    const desired = target
      .clone()
      .add(new THREE.Vector3(Math.sin(angle) * 12, 6, Math.cos(angle) * 12));
    if (!this.cameraReady) g.camera.position.copy(desired);
    else g.camera.position.lerp(desired, 1 - Math.exp(-4 * dt));
    g.camera.up.set(0, 1, 0);
    g.camera.lookAt(target);
    this.cameraReady = true;
    g.player.model.visible = true;
  }
}
