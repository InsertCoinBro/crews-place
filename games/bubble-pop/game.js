import * as THREE from "three";
import {
  Art,
  createScene,
  cloneAvatar,
  disposeScene,
  Sparkles,
  steer,
} from "../shared/scene.js";
import { BubbleRound, BUBBLE_SETTINGS } from "./state.js";

export class BubblePop {
  constructor(context) {
    this.ctx = context;
    this.scene = createScene(0xbbe9e8);
    this.scene.fog = new THREE.Fog(0xbbe9e8, 36, 95);
    this.camera = new THREE.PerspectiveCamera(57, 1, 0.1, 120);
    this.art = new Art();
    this.round = new BubbleRound();
    this.time = 0;
    this.spawnClock = 0;
    this.serial = 0;
    this.bubbles = [];
    this.velocity = new THREE.Vector2();
    this.avatar = cloneAvatar(context.avatar);
    this.avatar.rotation.y = Math.PI;
    this.avatar.position.set(0, 4, 0);
    this.scene.add(this.avatar);
    this.equipment = new THREE.Group();
    this.equipment.name = "bubble-equipment";
    this.avatar.add(this.equipment);
    const a = this.art;
    a.box(this.equipment, 0, 1, -0.35, 0.64, 0.69, 0.35, 0x55cbd5);
    a.box(this.equipment, 0, 1.12, -0.55, 0.68, 0.13, 0.07, 0xf7cf59);
    a.box(this.equipment, 0, 0.86, -0.55, 0.68, 0.12, 0.07, 0xe979ba);
    for (const x of [-0.3, 0.3])
      a.cylinder(this.equipment, x, 0.55, -0.35, 0.13, 0.1, 0.35, 0xc587ce);
    const wand = a.cylinder(
      this.equipment,
      0.53,
      1.03,
      0.8,
      0.045,
      0.045,
      1,
      0xf2b148,
    );
    wand.rotation.x = Math.PI / 2;
    const ring = a.mesh(
      this.equipment,
      new THREE.TorusGeometry(0.3, 0.05, 8, 28),
      0xeb77b1,
      0.53,
      1.03,
      1.4,
    );
    ring.name = "bubble-wand";
    this.sparkles = new Sparkles(this.scene);
    this.palette = [0x79cdeb, 0xf2a5d0, 0xbda6ed, 0xf9ce6f, 0x93dfb2];
    this.bubbleGeometry = new THREE.SphereGeometry(1, 28, 20);
    this.bubbleMaterials = this.palette.map(
      (color) =>
        new THREE.MeshPhysicalMaterial({
          color,
          transparent: true,
          opacity: 0.58,
          roughness: 0.08,
          metalness: 0.12,
          clearcoat: 1,
          side: THREE.FrontSide,
          depthWrite: false,
        }),
    );
    this.glintGeometry = new THREE.SphereGeometry(1, 10, 8);
    this.glintMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });
    this.rimGeometry = new THREE.TorusGeometry(0.99, 0.018, 6, 36);
    this.rimMaterials = this.palette.map(
      (color) => new THREE.MeshBasicMaterial({ color }),
    );
    this.clouds = [];
    for (let i = 0; i < 18; i++) {
      const cloud = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const puff = a.ball(
          cloud,
          (j - 1.5) * 1.1,
          Math.sin(j) * 0.25,
          0,
          0.9,
          0xf7fcf2,
          1,
        );
        puff.scale.y = 0.6;
      }
      cloud.position.set(
        (i % 2 ? 1 : -1) * (9 + (i % 4)),
        -1 + (i % 3) * 0.5,
        -i * 5,
      );
      this.scene.add(cloud);
      this.clouds.push(cloud);
    }
    for (let i = 0; i < 7; i++) {
      const island = a.ball(
        this.scene,
        (i % 2 ? 1 : -1) * 17,
        -7,
        -i * 15,
        7,
        0x9bd2bc,
        1,
      );
      island.scale.set(1, 0.45, 1);
    }
    context.hud.start({
      id: "bubble",
      title: "Bubble Pop",
      symbol: "◌",
      instructions:
        "WASD or arrows · Steer up, down, left & right. Touch a bubble with you or your wand.",
    });
    context.hud.message("Follow the bubbles. There’s no hurry.");
    this.updateStats();
    // A few close bubbles make the first action immediately discoverable.
    for (let i = 0; i < 8; i++) this.spawn(-5 - i * 3.6, i % 2 === 0);
    this.camera.position.set(0, 7.2, 11);
  }
  spawn(z = -36, aligned = false) {
    const p = this.avatar.position;
    const colorIndex = this.serial++ % this.palette.length,
      radius = 0.65 + Math.random() * 0.55;
    const x = aligned
      ? p.x
      : THREE.MathUtils.clamp(
          p.x + (Math.random() - 0.5) * 5.5,
          -this.limitX,
          this.limitX,
        );
    const y = aligned
      ? p.y + 0.95
      : THREE.MathUtils.clamp(p.y + 0.95 + (Math.random() - 0.5) * 3.5, 3, 9);
    const model = new THREE.Group();
    const ball = new THREE.Mesh(
      this.bubbleGeometry,
      this.bubbleMaterials[colorIndex],
    );
    model.add(ball);
    const rim = new THREE.Mesh(this.rimGeometry, this.rimMaterials[colorIndex]);
    model.add(rim);
    const glint = new THREE.Mesh(this.glintGeometry, this.glintMaterial);
    glint.position.set(-0.3, 0.4, 0.81);
    glint.scale.set(0.19, 0.1, 0.045);
    model.add(glint);
    model.scale.setScalar(radius);
    model.position.set(x, y, z);
    this.scene.add(model);
    const bubble = {
      model,
      x,
      y,
      radius,
      phase: Math.random() * 6,
      color: this.palette[colorIndex],
      popped: false,
    };
    this.bubbles.push(bubble);
    return bubble;
  }
  get limitX() {
    return Math.min(6, 4.5 * this.camera.aspect);
  }
  updateStats() {
    this.ctx.hud.stats("Bubbles popped: " + this.round.count + " / 100");
  }
  pop(bubble) {
    if (!this.round.pop(bubble)) return;
    this.sparkles.burst(
      bubble.model.position,
      bubble.color,
      this.ctx.calm ? 9 : 23,
    );
    this.ctx.audio.play("pop");
    this.updateStats();
    if (this.round.phase === "complete") {
      this.ctx.audio.play("win");
      this.ctx.hud.message("100 lovely pops! Back to the arcade in a moment.");
      this.ctx.hud.result({
        tag: "YOU DID IT!",
        title: "A sky full of joy.",
        copy: "You popped all 100 bubbles. Returning to the arcade…",
        actions: [
          { label: "Return to Arcade", run: this.ctx.exit, primary: true },
        ],
      });
    }
  }
  update(dt, input) {
    this.time += dt;
    this.avatar.animator?.update(dt);
    this.sparkles.update(dt, 0.6);
    if (this.round.phase === "complete") {
      if (this.round.tick(dt)) this.ctx.exit();
      return;
    }
    const direction = steer(input),
      p = this.avatar.position;
    this.velocity.lerp(
      new THREE.Vector2(direction.x, direction.y),
      1 - Math.exp(-7 * dt),
    );
    p.x = THREE.MathUtils.clamp(
      p.x + this.velocity.x * 5.2 * dt,
      -this.limitX,
      this.limitX,
    );
    p.y = THREE.MathUtils.clamp(p.y + this.velocity.y * 4.2 * dt, 2.1, 8);
    this.avatar.rotation.z = this.velocity.x * 0.12;
    this.avatar.rotation.x = 0.16 + Math.sin(this.time * 2) * 0.035;
    this.spawnClock += dt;
    while (this.spawnClock >= BUBBLE_SETTINGS.spawnEvery) {
      this.spawnClock -= BUBBLE_SETTINGS.spawnEvery;
      this.spawn(-36, this.serial % 3 === 0);
    }
    const center = p.clone().add(new THREE.Vector3(0, 0.9, 0)),
      wand = p.clone().add(new THREE.Vector3(-0.53, 1.03, -1.4));
    for (const bubble of this.bubbles) {
      bubble.model.position.z += BUBBLE_SETTINGS.speed * dt;
      bubble.model.position.x =
        bubble.x + Math.sin(this.time * 1.1 + bubble.phase) * 0.22;
      bubble.model.position.y =
        bubble.y + Math.sin(this.time * 1.4 + bubble.phase) * 0.25;
      if (
        !bubble.popped &&
        (bubble.model.position.distanceTo(center) < bubble.radius + 0.67 ||
          bubble.model.position.distanceTo(wand) < bubble.radius + 0.38)
      )
        this.pop(bubble);
    }
    this.bubbles = this.bubbles.filter((b) => {
      if (b.popped || b.model.position.z > 7) {
        this.scene.remove(b.model);
        return false;
      }
      return true;
    });
    for (const cloud of this.clouds) {
      cloud.position.z += dt * 2.4;
      if (cloud.position.z > 14) cloud.position.z = -85;
    }
    const desired = new THREE.Vector3(p.x * 0.48, p.y + 3, 10.5);
    this.camera.position.lerp(desired, 1 - Math.exp(-3.5 * dt));
    this.camera.lookAt(p.x * 0.6, p.y + 0.9, -6);
  }
  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
  dispose() {
    disposeScene(this.scene);
    this.art.dispose();
    this.bubbleGeometry.dispose();
    this.glintGeometry.dispose();
    this.rimGeometry.dispose();
    this.bubbleMaterials.forEach((m) => m.dispose());
    this.rimMaterials.forEach((m) => m.dispose());
    this.glintMaterial.dispose();
    this.bubbles.length = 0;
  }
}
