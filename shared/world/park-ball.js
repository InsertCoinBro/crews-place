import * as THREE from "three";

// A pushable beach ball for Meadow Park. Pure cause-and-effect play: walk
// into it (or jump near it) and it rolls, bounces, and stays in the park.
// Physics are plain math on THREE.Vector3, so they run in node tests too.

const RADIUS = 0.45;
// Meadow Park's fenced area (matches town.js layout).
const MIN_X = 3;
const MAX_X = 17;
const MIN_Z = 0.6;
const MAX_Z = 17.4;

function ballTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const colors = ["#e23b3b", "#f2c230", "#3b8de2", "#7bc950", "#e25fb0", "#f27d2a"];
  const stripe = canvas.width / colors.length;
  colors.forEach((color, i) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(i * stripe, 0, stripe, canvas.height);
    ctx.fillStyle = color;
    ctx.fillRect(i * stripe + 5, 0, stripe - 10, canvas.height);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function ballMaterial() {
  if (typeof document === "undefined")
    return new THREE.MeshStandardMaterial({ color: 0xe25fb0, roughness: 0.5 });
  return new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: 0.5 });
}

export class BeachBall {
  constructor(group) {
    this.radius = RADIUS;
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(RADIUS, 28, 20),
      ballMaterial(),
    );
    this.mesh.position.set(10, RADIUS, 9);
    this.mesh.castShadow = true;
    this.mesh.name = "BeachBall";
    group.add(this.mesh);
    this.vel = new THREE.Vector3();
    this.spinAxis = new THREE.Vector3(1, 0, 0);
  }
  // Happy pop when the park sign is used.
  activate() {
    this.vel.set((Math.random() - 0.5) * 3, 5.5, (Math.random() - 0.5) * 3);
  }
  reset() {
    this.mesh.position.set(10, RADIUS, 9);
    this.vel.set(0, 0, 0);
  }
  update(dt, player) {
    const pos = this.mesh.position;
    // Player push: walking into the ball knocks it away.
    if (player && player.position) {
      const push = new THREE.Vector3().subVectors(pos, player.position);
      push.y = 0;
      const dist = push.length();
      if (dist < 1.4 && dist > 1e-4) {
        push.normalize();
        const speed = player.actualSpeed ?? 2;
        const strength = Math.max(3, speed * 2.2);
        this.vel.addScaledVector(push, strength * dt * 4);
        if (pos.y < this.radius + 0.15) this.vel.y += 3.2 * dt;
      }
    }
    // Floaty gravity + drag.
    this.vel.y -= 7.5 * dt;
    this.vel.multiplyScalar(Math.max(0, 1 - 0.55 * dt));
    pos.addScaledVector(this.vel, dt);
    // Ground bounce + rolling friction.
    if (pos.y < this.radius) {
      pos.y = this.radius;
      if (Math.abs(this.vel.y) > 1.1) this.vel.y = -this.vel.y * 0.55;
      else this.vel.y = 0;
      this.vel.x *= Math.max(0, 1 - 2.2 * dt);
      this.vel.z *= Math.max(0, 1 - 2.2 * dt);
    }
    // Stay in the park.
    if (pos.x < MIN_X) {
      pos.x = MIN_X;
      this.vel.x = Math.abs(this.vel.x) * 0.4;
    } else if (pos.x > MAX_X) {
      pos.x = MAX_X;
      this.vel.x = -Math.abs(this.vel.x) * 0.4;
    }
    if (pos.z < MIN_Z) {
      pos.z = MIN_Z;
      this.vel.z = Math.abs(this.vel.z) * 0.4;
    } else if (pos.z > MAX_Z) {
      pos.z = MAX_Z;
      this.vel.z = -Math.abs(this.vel.z) * 0.4;
    }
    // Roll the texture as it moves.
    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    if (hSpeed > 0.05) {
      this.spinAxis.set(this.vel.z, 0, -this.vel.x).normalize();
      this.mesh.rotateOnWorldAxis(this.spinAxis, (hSpeed * dt) / this.radius);
    }
  }
}
