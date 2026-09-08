import * as THREE from "three";
import { box, cylinder, label, material } from "./models.js";

// The player chose this open southeast clearing from the live map. The runway
// points north so a takeoff carries the plane across Little Town.
export const AIRFIELD_SITE = Object.freeze({
  x: 52,
  z: 50,
  width: 42,
  depth: 76,
  runwayStart: Object.freeze({ x: 52, z: 80 }),
  runwayEnd: Object.freeze({ x: 52, z: 20 }),
  hangar: Object.freeze({ x: 72, z: 68 }),
});
export const AIRFIELD_BOUNDS = Object.freeze({
  minX: AIRFIELD_SITE.x - AIRFIELD_SITE.width / 2,
  maxX: AIRFIELD_SITE.x + AIRFIELD_SITE.width / 2,
  minZ: AIRFIELD_SITE.z - AIRFIELD_SITE.depth / 2,
  maxZ: AIRFIELD_SITE.z + AIRFIELD_SITE.depth / 2,
});

export const PLANE_MAX_ALTITUDE = 72;
export const PLANE_MAX_SPEED = 30;
export const PLANE_WORLD_LIMIT = 86;

function addCollider(area, x, z, width, depth, maxY = 8) {
  area.colliders.push({
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
    maxY,
  });
}

function makePropeller(parent, x, y, z) {
  const propeller = new THREE.Group();
  propeller.position.set(x, y, z);
  parent.add(propeller);
  cylinder(propeller, 0, 0, 0.08, 0.17, 0.17, 0.3, 0xe9c158, 12).rotation.x =
    Math.PI / 2;
  const bladeA = box(propeller, 0, 0, 0.24, 0.16, 1.7, 0.08, 0x345a62);
  const bladeB = box(propeller, 0, 0, 0.25, 1.7, 0.16, 0.08, 0x345a62);
  bladeA.castShadow = bladeB.castShadow = true;
  return propeller;
}

export function makeFlyablePlane() {
  const plane = new THREE.Group();
  plane.name = "skybird-plane";

  // A chunky, friendly twin-propeller silhouette that stays readable from the
  // game's follow camera and from high above town.
  box(plane, 0, 0.82, 0, 1.05, 1.05, 5.25, 0xf5cf58);
  box(plane, 0, 1.2, -0.35, 0.86, 0.62, 1.7, 0x5d9eac);
  box(plane, 0, 0.88, -0.98, 0.9, 0.32, 0.75, 0xbde1e4);
  box(plane, 0, 0.85, 0.2, 6.3, 0.18, 1.15, 0xffe8a0);
  box(plane, 0, 1.05, -2.05, 2.65, 0.14, 0.78, 0xffe8a0);
  box(plane, 0, 1.65, -2.28, 0.15, 1.45, 0.72, 0xf2c54d);
  box(plane, 0, 0.7, 2.67, 0.56, 0.58, 0.35, 0xf2b947);

  const props = [];
  for (const x of [-1.72, 1.72]) {
    box(plane, x, 0.76, 0.55, 0.62, 0.7, 1.45, 0xf2c54d);
    props.push(makePropeller(plane, x, 0.8, 1.38));
    const wheel = cylinder(
      plane,
      x,
      0.27,
      0.25,
      0.24,
      0.24,
      0.15,
      0x2f4548,
      12,
    );
    wheel.rotation.z = Math.PI / 2;
  }
  const noseWheel = cylinder(
    plane,
    0,
    0.22,
    1.85,
    0.19,
    0.19,
    0.13,
    0x2f4548,
    12,
  );
  noseWheel.rotation.z = Math.PI / 2;
  plane.userData.propellers = props;
  plane.userData.flyable = true;
  return plane;
}

class PlaneEngineSound {
  constructor() {
    this.context = null;
    this.oscillator = null;
    this.gain = null;
    this.filter = null;
  }

  start() {
    const AudioContextClass =
      globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AudioContextClass || this.oscillator) return;
    try {
      this.context = new AudioContextClass();
      this.oscillator = this.context.createOscillator();
      this.filter = this.context.createBiquadFilter();
      this.gain = this.context.createGain();
      this.oscillator.type = "sawtooth";
      this.filter.type = "lowpass";
      this.filter.frequency.value = 320;
      this.gain.gain.value = 0.0001;
      this.oscillator.connect(this.filter);
      this.filter.connect(this.gain);
      this.gain.connect(this.context.destination);
      this.oscillator.start();
      this.setActive(true, 0);
    } catch {
      this.stop();
    }
  }

  update(speed, active = true) {
    if (!this.oscillator || !this.context) return;
    const now = this.context.currentTime;
    const amount = THREE.MathUtils.clamp(speed / PLANE_MAX_SPEED, 0, 1);
    this.oscillator.frequency.setTargetAtTime(52 + amount * 38, now, 0.08);
    this.filter.frequency.setTargetAtTime(230 + amount * 240, now, 0.1);
    this.gain.gain.setTargetAtTime(
      active ? 0.028 + amount * 0.022 : 0.0001,
      now,
      0.08,
    );
  }

  setActive(active, speed = 0) {
    if (active && this.context?.state === "suspended") this.context.resume();
    this.update(speed, active);
  }

  stop() {
    try {
      this.oscillator?.stop();
      this.context?.close();
    } catch {
      // Audio cleanup should never interrupt the game.
    }
    this.context = this.oscillator = this.filter = this.gain = null;
  }
}

export class FlyablePlane {
  constructor(group) {
    this.model = makeFlyablePlane();
    group.add(this.model);
    this.spawn = new THREE.Vector3(
      AIRFIELD_SITE.runwayStart.x,
      0,
      AIRFIELD_SITE.runwayStart.z,
    );
    this.heading = Math.PI;
    this.speed = 0;
    this.throttle = 0;
    this.verticalSpeed = 0;
    this.airborne = false;
    this.occupied = false;
    this.engine = new PlaneEngineSound();
    this.reset();
  }

  reset() {
    this.speed = 0;
    this.throttle = 0;
    this.verticalSpeed = 0;
    this.airborne = false;
    this.heading = Math.PI;
    this.model.position.copy(this.spawn);
    this.model.rotation.set(0, this.heading, 0);
    this.syncInteraction();
  }

  syncInteraction() {
    if (this.interaction)
      Object.assign(this.interaction, {
        x: this.model.position.x,
        z: this.model.position.z,
      });
  }

  update(dt, input) {
    const climb =
      Number(input.down("KeyW", "ArrowUp")) -
      Number(input.down("KeyS", "ArrowDown"));
    const turn =
      Number(input.down("KeyD", "ArrowRight")) -
      Number(input.down("KeyA", "ArrowLeft"));

    if (!this.airborne) {
      this.throttle = THREE.MathUtils.clamp(
        this.throttle + (climb > 0 ? 0.55 : climb < 0 ? -0.8 : -0.12) * dt,
        0,
        1,
      );
    } else if (climb > 0) {
      this.throttle = Math.min(1, this.throttle + 0.18 * dt);
    }

    const minimumFlightSpeed = this.airborne ? 17 : 0;
    const targetSpeed = Math.max(
      minimumFlightSpeed,
      this.throttle * PLANE_MAX_SPEED,
    );
    this.speed +=
      (targetSpeed - this.speed) *
      (1 - Math.exp(-(this.airborne ? 2.2 : 1.8) * dt));

    if (!this.airborne && this.speed > 14 && climb > 0) {
      this.airborne = true;
      this.verticalSpeed = 4.8;
    }

    const steerRate = this.airborne ? 1.05 : 0.42;
    const steerStrength = this.airborne
      ? 1
      : THREE.MathUtils.clamp(this.speed / 12, 0, 1);
    this.heading -= turn * steerRate * steerStrength * dt;

    if (this.airborne) {
      const targetVertical = climb * 10.5;
      this.verticalSpeed +=
        (targetVertical - this.verticalSpeed) * (1 - Math.exp(-2.8 * dt));
      this.model.position.y = THREE.MathUtils.clamp(
        this.model.position.y + this.verticalSpeed * dt,
        0,
        PLANE_MAX_ALTITUDE,
      );
      if (
        (this.model.position.y === PLANE_MAX_ALTITUDE &&
          this.verticalSpeed > 0) ||
        (this.model.position.y === 0 && this.verticalSpeed < 0)
      )
        this.verticalSpeed = 0;
      if (this.model.position.y === 0 && climb < 0) {
        this.airborne = false;
        this.throttle = Math.min(this.throttle, 0.32);
      }
    }

    const movement = this.speed * dt;
    this.model.position.x += Math.sin(this.heading) * movement;
    this.model.position.z += Math.cos(this.heading) * movement;
    this.model.position.x = THREE.MathUtils.clamp(
      this.model.position.x,
      -PLANE_WORLD_LIMIT,
      PLANE_WORLD_LIMIT,
    );
    this.model.position.z = THREE.MathUtils.clamp(
      this.model.position.z,
      -PLANE_WORLD_LIMIT,
      PLANE_WORLD_LIMIT,
    );

    const bank = -turn * (this.airborne ? 0.34 : 0.08);
    const pitch = this.airborne ? -climb * 0.13 : 0;
    this.model.rotation.y = this.heading;
    this.model.rotation.z +=
      (bank - this.model.rotation.z) * (1 - Math.exp(-5 * dt));
    this.model.rotation.x +=
      (pitch - this.model.rotation.x) * (1 - Math.exp(-4 * dt));
    for (const propeller of this.model.userData.propellers)
      propeller.rotation.z -= dt * (8 + this.throttle * 34);
    this.engine.update(this.speed, true);
    this.syncInteraction();
    return {
      altitude: this.model.position.y,
      speed: this.speed,
      airborne: this.airborne,
    };
  }

  cameraYaw() {
    return this.heading + Math.PI;
  }

  enter(player) {
    if (this.occupied) return false;
    this.occupied = true;
    player.position.copy(this.model.position);
    player.heading = this.heading;
    player.inVehicle = true;
    player.model.visible = false;
    player.sync();
    this.engine.start();
    return true;
  }

  setAudioActive(active) {
    this.engine.setActive(active, this.speed);
  }

  exit(player) {
    if (!this.occupied) return false;
    this.occupied = false;
    this.engine.stop();
    this.reset();
    player.teleport(this.spawn.x + 4.2, this.spawn.z);
    player.heading = Math.PI;
    player.inVehicle = false;
    player.model.visible = true;
    player.sync();
    return true;
  }
}

export function buildAirfield(area) {
  const g = area.group;
  const { x, z, hangar } = AIRFIELD_SITE;

  const runway = box(g, x, 0.025, z, 12, 0.12, 64, 0x52666c);
  runway.name = "airfield-runway";
  for (let dashZ = 25; dashZ <= 75; dashZ += 7)
    box(g, x, 0.095, dashZ, 0.45, 0.035, 3.4, 0xf7f0d7);
  for (const sideX of [x - 5.25, x + 5.25])
    for (let lightZ = 22; lightZ <= 78; lightZ += 4)
      cylinder(g, sideX, 0.18, lightZ, 0.1, 0.13, 0.24, 0xf6d77d, 8);
  for (const stripeX of [-3.6, -2.4, -1.2, 1.2, 2.4, 3.6])
    box(g, x + stripeX, 0.1, 22, 0.65, 0.035, 4, 0xf7f0d7);

  // The hangar is open toward the runway, with a deep contrasting interior.
  box(g, hangar.x + 5.4, 3.5, hangar.z, 0.5, 7, 13, 0x47727b);
  box(g, hangar.x, 3.5, hangar.z - 6.25, 10.8, 7, 0.5, 0x5c8c91);
  box(g, hangar.x, 3.5, hangar.z + 6.25, 10.8, 7, 0.5, 0x5c8c91);
  box(g, hangar.x, 6.9, hangar.z, 11.2, 0.48, 13.2, 0xf0cf6b);
  box(g, hangar.x, 0.08, hangar.z, 10.4, 0.12, 12, 0xd8c58d);
  box(g, hangar.x + 5.1, 3.2, hangar.z, 0.08, 5.6, 11.6, 0x31565e);
  const hangarLabel = label(
    g,
    "SKYBIRD HANGAR",
    hangar.x - 5.66,
    6.1,
    hangar.z,
    8.8,
    "#ffe59a",
    "#244e55",
  );
  hangarLabel.rotation.y = Math.PI / 2;
  addCollider(area, hangar.x + 5.4, hangar.z, 0.6, 13, 7.5);
  addCollider(area, hangar.x, hangar.z - 6.25, 11, 0.7, 7.5);
  addCollider(area, hangar.x, hangar.z + 6.25, 11, 0.7, 7.5);

  // A simple windsock provides an easy visual cue for the airfield entrance.
  cylinder(g, 39, 2.6, 78, 0.09, 0.13, 5.2, 0x355e64, 8);
  const sock = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.48, 2.8, 10, 1, true),
    material(0xe7835f),
  );
  sock.rotation.z = Math.PI / 2;
  sock.position.set(40.35, 4.8, 78);
  sock.castShadow = true;
  g.add(sock);

  return { runway, site: AIRFIELD_SITE };
}
