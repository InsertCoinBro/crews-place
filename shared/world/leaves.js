import * as THREE from "three";
import { LEAVES } from "./town.js";
import { material } from "./models.js";
export class Leaves {
  constructor(group) {
    this.particles = [];
    this.cooldown = 0;
    this.inside = false;
    const geometry = new THREE.OctahedronGeometry(0.19);
    const colors = [0xba7041, 0xe0a64f, 0xe7bf67, 0xad7b49, 0xcc8852];
    for (let i = 0; i < 95; i++) {
      const mesh = new THREE.Mesh(geometry, material(colors[i % 5]));
      const angle = i * 2.4,
        r = Math.sqrt(i / 95) * LEAVES.radius;
      mesh.position.set(
        LEAVES.x + Math.cos(angle) * r,
        0.1 + (1 - r / LEAVES.radius) * 0.45,
        LEAVES.z + Math.sin(angle) * r,
      );
      mesh.scale.set(1.3, 0.22, 1);
      mesh.rotation.y = angle;
      mesh.castShadow = true;
      group.add(mesh);
      this.particles.push({
        mesh,
        home: mesh.position.clone(),
        velocity: new THREE.Vector3(),
        life: 0,
      });
    }
  }
  burst(calm = false) {
    if (this.cooldown > 0) return false;
    this.cooldown = 0.6;
    this.particles.forEach((p, i) => {
      if (calm && i % 4) return;
      p.mesh.position.copy(p.home);
      const a = i * 2.4;
      p.velocity.set(
        Math.cos(a) * (1 + (i % 3)),
        3 + (i % 7) * 0.3,
        Math.sin(a) * (1 + (i % 3)),
      );
      p.life = 1.7;
    });
    return true;
  }
  update(dt, player, event, calm) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    let burst = false;
    if (player) {
      const inside =
        Math.hypot(player.position.x - LEAVES.x, player.position.z - LEAVES.z) <
          LEAVES.radius && player.position.y < 0.7;
      if (inside && (!this.inside || event === "land"))
        burst = this.burst(calm);
      this.inside = inside;
    }
    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.velocity.y -= 5 * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.mesh.rotation.x += dt * 3;
      p.mesh.rotation.z += dt * 2;
      if (p.life <= 0 || p.mesh.position.y < 0.06) {
        p.life = 0;
        p.mesh.position.copy(p.home);
        p.mesh.rotation.x = p.mesh.rotation.z = 0;
      }
    }
    return burst;
  }
}
