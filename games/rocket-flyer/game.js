import * as THREE from "three";
import {
  Art,
  createScene,
  cloneAvatar,
  showAvatarPortrait,
  disposeScene,
  Sparkles,
  steer,
} from "../shared/scene.js";
import { RocketCampaign } from "./state.js";
import { canvasTexture } from "../shared/art.js";

function starShape() {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 + Math.PI / 2,
      r = i % 2 ? 0.43 : 0.87;
    const x = Math.cos(a) * r,
      y = Math.sin(a) * r;
    if (!i) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  s.closePath();
  return s;
}
export class RocketFlyer {
  constructor(context) {
    this.ctx = context;
    this.scene = createScene(0x192847);
    this.camera = new THREE.OrthographicCamera(-12, 12, 9, -9, 0.1, 90);
    this.camera.position.set(0, 0, 35);
    this.camera.lookAt(0, 0, 0);
    this.art = new Art();
    this.campaign = new RocketCampaign();
    this.time = 0;
    this.diamondClock = 0;
    this.obstacleClock = 0;
    this.spawnCount = 0;
    this.entities = [];
    this.velocity = new THREE.Vector2();
    this.limitX = 8;
    this.sparkles = new Sparkles(this.scene, 320);
    this.sparkles.points.material.size = 3.5;
    this.sparkles.points.material.sizeAttenuation = false;
    this.createBackdrop();
    this.createRocket(context.avatar);
    this.diamondGeometry = new THREE.OctahedronGeometry(0.43);
    this.diamondMaterial = this.art.mat(0x8cffee, {
      emissive: 0x247d91,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.25,
    });
    this.meteorGeometry = new THREE.IcosahedronGeometry(0.72, 1);
    this.starGeometry = new THREE.ExtrudeGeometry(starShape(), {
      depth: 0.25,
      bevelEnabled: true,
      bevelThickness: 0.08,
      bevelSize: 0.06,
      bevelSegments: 1,
      steps: 1,
    });
    context.hud.start({
      id: "rocket",
      title: "Rocket Flyer",
      symbol: "✦",
      instructions:
        "WASD or arrows · Collect cyan diamonds. Avoid rocks, spiky orange stars & green aliens.",
    });
    this.refreshHUD();
    this.resetFlight();
  }
  createBackdrop() {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const c = canvas.getContext("2d"),
      gradient = c.createRadialGradient(256, 256, 5, 256, 256, 250);
    gradient.addColorStop(0, "#a177c575");
    gradient.addColorStop(0.5, "#684b9430");
    gradient.addColorStop(1, "#684b9400");
    c.fillStyle = gradient;
    c.fillRect(0, 0, 512, 512);
    const nebula = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 34),
      new THREE.MeshBasicMaterial({
        map: canvasTexture(canvas),
        transparent: true,
        depthWrite: false,
      }),
    );
    nebula.position.set(4, 2, -16);
    this.scene.add(nebula);
    this.stars = [];
    for (let layer = 0; layer < 3; layer++) {
      const positions = new Float32Array(150 * 3);
      for (let i = 0; i < 150; i++)
        positions.set(
          [
            (Math.random() - 0.5) * 50,
            (Math.random() - 0.5) * 30,
            -12 + layer * 2,
          ],
          i * 3,
        );
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      const points = new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          color: [0x738bab, 0xc3c7e1, 0xffe8b3][layer],
          size: 1 + layer * 0.7,
          sizeAttenuation: false,
          transparent: true,
          opacity: 0.75,
          depthWrite: false,
        }),
      );
      this.scene.add(points);
      this.stars.push({ points, positions, speed: 0.6 + layer * 0.8 });
    }
    const planet = this.art.ball(this.scene, -9, 5, -9, 2.7, 0x7894ab, 2);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(3.6, 0.19, 8, 60),
      this.art.mat(0xb3b2c5),
    );
    ring.position.copy(planet.position);
    ring.rotation.set(0.7, 0.25, 0.35);
    this.scene.add(ring);
    this.art.ball(this.scene, 11, -6, -10, 4, 0x705783, 1);
  }
  createRocket(source) {
    const a = this.art;
    this.rocket = new THREE.Group();
    this.rocket.position.set(0, -4, 0);
    this.scene.add(this.rocket);
    a.cylinder(this.rocket, 0, 0, 0, 0.52, 0.52, 2.1, 0xf1ebd6);
    a.cylinder(this.rocket, 0, 1.5, 0, 0, 0.52, 0.9, 0xe77f9d);
    a.cylinder(this.rocket, 0, -1.12, 0, 0.55, 0.38, 0.25, 0x79bfc6);
    for (const s of [-1, 1]) {
      const fin = a.mesh(
        this.rocket,
        new THREE.ConeGeometry(0.55, 1.1, 3),
        0x6fb9c1,
        s * 0.6,
        -0.75,
        0,
      );
      fin.rotation.z = -s * 0.5;
    }
    const rim = a.mesh(
      this.rocket,
      new THREE.TorusGeometry(0.44, 0.085, 8, 40),
      0x5c8a9c,
      0,
      0.32,
      0.52,
    );
    const avatar = cloneAvatar(source);
    showAvatarPortrait(avatar);
    avatar.scale.setScalar(1.2);
    avatar.position.set(0, -1.56, 0.45);
    this.rocket.add(avatar);
    this.cockpitAvatar = avatar;
    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(0.41, 24, 16),
      new THREE.MeshPhysicalMaterial({
        color: 0xa7e6e9,
        transparent: true,
        opacity: 0.13,
        roughness: 0.05,
        depthWrite: false,
      }),
    );
    glass.scale.z = 0.4;
    glass.position.set(0, 0.32, 0.64);
    this.rocket.add(glass);
    this.flame = a.cylinder(this.rocket, 0, -1.85, 0, 0.29, 0, 1.25, 0xffbf6e);
    this.flame.material = new THREE.MeshBasicMaterial({ color: 0xffce85 });
    this.shield = new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.035, 6, 64),
      new THREE.MeshBasicMaterial({
        color: 0x8fe4f2,
        transparent: true,
        opacity: 0.7,
      }),
    );
    this.shield.position.set(0, 0.1, 0.3);
    this.rocket.add(this.shield);
  }
  spawnDiamond(x, y = 10.7) {
    const model = new THREE.Mesh(this.diamondGeometry, this.diamondMaterial);
    model.position.set(
      THREE.MathUtils.clamp(x, -this.limitX, this.limitX),
      y,
      0.3,
    );
    this.scene.add(model);
    const e = {
      type: "diamond",
      model,
      radius: 0.43,
      collected: false,
      spent: false,
    };
    this.entities.push(e);
    return e;
  }
  spawnObstacle(type, x, y = 11) {
    const model = new THREE.Group();
    model.position.set(
      THREE.MathUtils.clamp(x, -this.limitX, this.limitX),
      y,
      0,
    );
    const a = this.art;
    if (type === "meteor") {
      model.add(new THREE.Mesh(this.meteorGeometry, a.mat(0x9c8398)));
      a.ball(model, -0.25, 0.1, 0.57, 0.17, 0x645e7c, 0);
      a.ball(model, 0.3, -0.2, 0.5, 0.13, 0x645e7c, 0);
    }
    if (type === "star") {
      model.add(
        new THREE.Mesh(
          this.starGeometry,
          a.mat(0xf0a66a, { emissive: 0x8b374b, emissiveIntensity: 0.3 }),
        ),
      );
      for (const x of [-0.15, 0.15])
        a.ball(model, x, 0.08, 0.4, 0.055, 0x64394f, 1);
    }
    if (type === "alien") {
      const base = a.ball(model, 0, -0.05, 0, 0.73, 0xb393ce, 1);
      base.scale.set(1.25, 0.35, 1);
      const head = a.ball(model, 0, 0.32, 0, 0.44, 0xa0d58d, 1);
      for (const x of [-0.16, 0.16])
        a.ball(model, x, 0.39, 0.39, 0.075, 0x36504e, 1);
      a.cylinder(model, 0, 0.8, 0, 0.035, 0.035, 0.3, 0xa0d58d);
      a.ball(model, 0, 0.96, 0, 0.09, 0xedcd82);
    }
    const e = {
      type,
      model,
      radius: type === "alien" ? 0.79 : 0.72,
      spent: false,
      phase: Math.random() * 6,
    };
    this.entities.push(e);
    return e;
  }
  clearEntities() {
    for (const e of this.entities) this.removeEntity(e);
    this.entities.length = 0;
  }
  removeEntity(e) {
    this.scene.remove(e.model);
    // Diamonds and meteors share reusable geometry. Alien parts are unique.
    e.model.traverse((o) => {
      if (
        o.geometry &&
        ![
          this.diamondGeometry,
          this.meteorGeometry,
          this.starGeometry,
        ].includes(o.geometry)
      )
        o.geometry.dispose();
    });
  }
  resetFlight() {
    this.clearEntities();
    this.diamondClock = 0;
    this.obstacleClock = -1;
    this.spawnCount = 0;
    this.rocket.position.set(0, -4, 0);
    this.rocket.visible = true;
    this.velocity.set(0, 0);
    for (let i = 0; i < 4; i++) this.spawnDiamond(0, 0 + i * 2.7);
    this.ctx.hud.hideResult();
    this.ctx.focus();
    this.refreshHUD();
  }
  retry() {
    this.campaign.retry();
    this.resetFlight();
  }
  restart() {
    this.campaign.restart();
    this.resetFlight();
  }
  collect(entity) {
    if (!this.campaign.collect(entity)) return;
    this.sparkles.burst(
      entity.model.position,
      0x8df5dc,
      this.ctx.calm ? 6 : 15,
    );
    this.ctx.audio.play("diamond");
    this.refreshHUD();
    if (this.campaign.phase === "level-clear") {
      this.ctx.audio.play("win");
      this.sparkles.burst(
        this.rocket.position,
        0xffdc86,
        this.ctx.calm ? 14 : 45,
      );
      this.ctx.hud.message(
        "Level " + this.campaign.level + " complete! On to the next adventure…",
      );
    }
    if (this.campaign.phase === "complete") {
      this.ctx.audio.play("win");
      this.ctx.hud.result({
        tag: "ALL TEN LEVELS!",
        title: "A brilliant space explorer.",
        copy: "500 diamonds collected across the galaxy. What a journey!",
        actions: [
          { label: "Play Again", run: () => this.restart(), primary: true },
          { label: "Return to Arcade", run: this.ctx.exit },
        ],
      });
    }
  }
  damage(entity) {
    entity.spent = true;
    if (!this.campaign.hit()) return;
    this.ctx.audio.play("damage");
    this.sparkles.burst(this.rocket.position, 0xf7ba9e, 12);
    this.refreshHUD();
    if (this.campaign.phase === "failed") {
      this.rocket.visible = false;
      this.ctx.hud.result({
        tag: "TAKE A BREATHER",
        title: "Shields down.",
        copy:
          "You can try level " +
          this.campaign.level +
          " again. Your earlier levels are safe.",
        actions: [
          { label: "Retry Level", run: () => this.retry(), primary: true },
          { label: "Return to Arcade", run: this.ctx.exit },
        ],
      });
    }
  }
  refreshHUD() {
    const c = this.campaign;
    this.ctx.hud.stats(
      "Level " +
        c.level +
        " / 10  ·  Diamonds: " +
        c.diamonds +
        " / 50  ·  Shields: " +
        c.health +
        " / 3",
    );
    if (c.phase === "playing")
      this.ctx.hud.message(
        c.invulnerable > 0
          ? "Your shield is protecting you."
          : "Cyan diamonds are yours. Give the obstacles some space.",
      );
  }
  update(dt, input) {
    this.cockpitAvatar.animator?.update(dt);
    this.time += dt;
    this.sparkles.update(dt, 0);
    for (const layer of this.stars) {
      for (let i = 1; i < layer.positions.length; i += 3) {
        layer.positions[i] -= dt * layer.speed;
        if (layer.positions[i] < -15) layer.positions[i] = 15;
      }
      layer.points.geometry.attributes.position.needsUpdate = true;
    }
    const next = this.campaign.tick(dt);
    if (next === "next-level") this.resetFlight();
    this.flame.scale.y = 0.85 + Math.sin(this.time * 18) * 0.12;
    this.shield.visible = this.campaign.invulnerable > 0;
    if (this.campaign.phase !== "playing") return;
    const direction = steer(input);
    this.velocity.lerp(
      new THREE.Vector2(direction.x, direction.y),
      1 - Math.exp(-10 * dt),
    );
    const p = this.rocket.position;
    p.x = THREE.MathUtils.clamp(
      p.x + this.velocity.x * 6 * dt,
      -this.limitX,
      this.limitX,
    );
    p.y = THREE.MathUtils.clamp(p.y + this.velocity.y * 5.5 * dt, -6, 4.5);
    this.rocket.rotation.z =
      -this.velocity.x * 0.11 + Math.sin(this.time * 2) * 0.015;
    this.diamondClock += dt;
    this.obstacleClock += dt;
    const settings = this.campaign.settings;
    while (this.diamondClock >= settings.diamondEvery) {
      this.diamondClock -= settings.diamondEvery;
      const x =
        this.spawnCount % 3 === 0
          ? p.x
          : Math.sin(this.time * 0.47) * this.limitX * 0.62;
      this.spawnDiamond(x);
      this.spawnCount++;
    }
    if (this.obstacleClock >= settings.obstacleEvery) {
      this.obstacleClock = 0;
      let x = (Math.random() - 0.5) * this.limitX * 2;
      if (Math.abs(x - p.x) < 1.7)
        x = THREE.MathUtils.clamp(
          p.x + (x > p.x ? 2.7 : -2.7),
          -this.limitX,
          this.limitX,
        );
      const lane = this.entities
        .filter((e) => e.type === "diamond" && e.model.position.y > 5)
        .map((e) => e.model.position.x);
      if (lane.some((v) => Math.abs(x - v) < 1.3))
        x = x > 0 ? -this.limitX * 0.86 : this.limitX * 0.86;
      this.spawnObstacle(
        ["meteor", "meteor", "star", "alien"][
          Math.floor(this.time / settings.obstacleEvery) % 4
        ],
        x,
      );
    }
    for (const e of this.entities) {
      e.model.position.y -= dt * settings.speed;
      if (e.type === "diamond") e.model.rotation.y += dt * 1.6;
      if (e.type === "meteor" || e.type === "star")
        e.model.rotation.z += dt * 0.4;
      if (e.type === "alien") {
        const direction = Math.sign(p.x - e.model.position.x);
        e.model.position.x = THREE.MathUtils.clamp(
          e.model.position.x + direction * settings.alienDrift * dt,
          -this.limitX,
          this.limitX,
        );
        e.model.rotation.z = Math.sin(this.time * 2 + e.phase) * 0.12;
      }
      if (
        !e.spent &&
        !e.collected &&
        Math.hypot(e.model.position.x - p.x, e.model.position.y - p.y) <
          e.radius + 0.53
      ) {
        if (e.type === "diamond") this.collect(e);
        else this.damage(e);
      }
    }
    this.entities = this.entities.filter((e) => {
      if (e.spent || e.collected || e.model.position.y < -11) {
        this.removeEntity(e);
        return false;
      }
      return true;
    });
    this.refreshHUD();
  }
  resize(width, height) {
    const aspect = width / height;
    this.camera.left = -9.5 * aspect;
    this.camera.right = 9.5 * aspect;
    this.camera.top = 9.5;
    this.camera.bottom = -9.5;
    this.camera.updateProjectionMatrix();
    this.limitX = Math.max(2, Math.min(9, 9.5 * aspect - 1.3));
  }
  dispose() {
    this.clearEntities();
    disposeScene(this.scene);
    this.art.dispose();
    this.diamondGeometry.dispose();
    this.diamondMaterial.dispose();
    this.meteorGeometry.dispose();
    this.starGeometry.dispose();
  }
}
