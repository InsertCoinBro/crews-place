import * as THREE from "three";
import {
  Art,
  createScene,
  cloneAvatar,
  disposeScene,
  Sparkles,
} from "../shared/scene.js";
import { PAIRS, tileTexture } from "../shared/art.js";
import { MemoryRound, MEMORY_SETTINGS } from "./state.js";

export class MemoryHop {
  constructor(context) {
    this.ctx = context;
    this.scene = createScene(0xddeee3);
    this.art = new Art();
    this.camera = new THREE.OrthographicCamera(-10, 10, 7, -7, 0.1, 80);
    this.camera.position.set(0, 16, 11);
    this.camera.lookAt(0, 0, 0);
    this.round = new MemoryRound();
    this.hopTime = 0;
    this.time = 0;
    this.avatar = cloneAvatar(context.avatar);
    this.avatar.scale.setScalar(0.48);
    this.avatar.rotation.y = 0;
    this.scene.add(this.avatar);
    this.sparkles = new Sparkles(this.scene);
    this.sparkles.points.material.size = 3.5;
    this.sparkles.points.material.sizeAttenuation = false;
    this.textures = new Map(PAIRS.map((p) => [p.id, tileTexture(p)]));
    this.backTexture = tileTexture(null);
    const a = this.art;
    a.box(this.scene, 0, -0.26, 0, 14.1, 0.46, 9.8, 0x81b6a1);
    a.box(this.scene, 0, -0.05, 0, 13.7, 0.08, 9.4, 0xc6decb);
    this.cards = Array.from({ length: 24 }, (_, i) => {
      const position = this.position(i),
        group = new THREE.Group();
      group.position.set(position.x, 0.18, position.z);
      this.scene.add(group);
      a.box(group, 0, 0, 0, 1.93, 0.16, 1.93, 0xfaf4db);
      const front = new THREE.Mesh(
        new THREE.PlaneGeometry(1.86, 1.86),
        new THREE.MeshBasicMaterial({
          map: this.textures.get(this.round.tiles[i].pair),
          toneMapped: false,
        }),
      );
      front.rotation.x = -Math.PI / 2;
      front.position.y = 0.086;
      group.add(front);
      const back = new THREE.Mesh(
        new THREE.PlaneGeometry(1.86, 1.86),
        new THREE.MeshBasicMaterial({
          map: this.backTexture,
          toneMapped: false,
        }),
      );
      back.rotation.x = Math.PI / 2;
      back.rotation.z = Math.PI;
      back.position.y = -0.086;
      group.add(back);
      const base = a.box(
        this.scene,
        position.x,
        -0.003,
        position.z,
        2.04,
        0.1,
        2.04,
        0x649d89,
      );
      return { group, front, base };
    });
    this.highlight = new THREE.Group();
    for (const [x, z, w, d] of [
      [0, -1.08, 2.18, 0.075],
      [0, 1.08, 2.18, 0.075],
      [-1.08, 0, 0.075, 2.18],
      [1.08, 0, 0.075, 2.18],
    ])
      a.box(this.highlight, x, 0.13, z, w, 0.12, d, 0xeaa04d);
    this.scene.add(this.highlight);
    this.setAvatar(this.round.current);
    this.hopFrom = this.avatar.position.clone();
    this.hopTo = this.avatar.position.clone();
    context.hud.start({
      id: "memory",
      title: "Memory Hop",
      symbol: "▦",
      instructions:
        "Arrow keys · Hop one square at a time. Stop for a moment to reveal a tile. Match two alike.",
    });
    this.refreshHUD();
  }
  position(index) {
    return new THREE.Vector3(
      ((index % 6) - 2.5) * 2.16,
      0,
      (Math.floor(index / 6) - 1.5) * 2.16,
    );
  }
  avatarPosition(index) {
    return this.position(index).add(new THREE.Vector3(0.59, 0.3, -0.59));
  }
  setAvatar(index) {
    this.avatar.position.copy(this.avatarPosition(index));
  }
  reset() {
    this.round.reset();
    this.hopTime = 0;
    this.setAvatar(0);
    this.hopFrom.copy(this.avatar.position);
    this.hopTo.copy(this.avatar.position);
    this.cards.forEach((card, i) => {
      card.front.material.map = this.textures.get(this.round.tiles[i].pair);
      card.front.material.needsUpdate = true;
      card.group.rotation.z = 0;
    });
    this.ctx.hud.hideResult();
    this.ctx.focus();
    this.refreshHUD();
  }
  refreshHUD() {
    this.ctx.hud.stats("Pairs matched: " + this.round.pairs + " / 12");
    if (this.round.phase === "preview") {
      this.ctx.hud.message(
        "Remember the pictures · " +
          Math.ceil(this.round.previewRemaining) +
          " seconds",
      );
      this.ctx.hud.progress(
        this.round.previewRemaining / MEMORY_SETTINGS.previewSeconds,
        "A little look before we begin",
      );
    } else if (this.round.phase === "complete") {
      this.ctx.hud.message("Every pair found. Beautiful remembering!");
      this.ctx.hud.progress(null);
    } else if (this.round.phase === "mismatch") {
      this.ctx.hud.message("Two different pictures. Have another look.");
      this.ctx.hud.progress(null);
    } else {
      this.ctx.hud.message(
        this.round.first === null
          ? "Find two pictures that belong together."
          : "One found. Hop to its matching picture.",
      );
      this.ctx.hud.progress(
        this.round.dwell / MEMORY_SETTINGS.dwellSeconds,
        this.round.armed ? "Stay here to reveal" : "Hop to another square",
      );
    }
  }
  update(dt, input) {
    this.time += dt;
    this.avatar.animator?.update(dt, {
      grounded: !this.round.moving,
      velocityY: this.hopTime < MEMORY_SETTINGS.hopSeconds / 2 ? 1 : -1,
    });
    this.sparkles.update(dt);
    if (!this.round.moving) {
      let dx = 0,
        dz = 0;
      const left = input.consume("ArrowLeft", "KeyA"),
        right = input.consume("ArrowRight", "KeyD"),
        up = input.consume("ArrowUp", "KeyW"),
        down = input.consume("ArrowDown", "KeyS");
      if (left || input.down("ArrowLeft", "KeyA")) dx = -1;
      else if (right || input.down("ArrowRight", "KeyD")) dx = 1;
      else if (up || input.down("ArrowUp", "KeyW")) dz = -1;
      else if (down || input.down("ArrowDown", "KeyS")) dz = 1;
      if ((dx || dz) && this.round.move(dx, dz)) {
        this.hopFrom.copy(this.avatar.position);
        this.hopTo.copy(this.avatarPosition(this.round.target));
        this.hopTime = 0;
      }
    }
    if (this.round.moving) {
      this.hopTime += dt;
      const t = Math.min(1, this.hopTime / MEMORY_SETTINGS.hopSeconds),
        ease = t * t * (3 - 2 * t);
      this.avatar.position.lerpVectors(this.hopFrom, this.hopTo, ease);
      this.avatar.position.y += Math.sin(t * Math.PI) * 0.75;
      if (t === 1) this.round.land();
    }
    const event = this.round.tick(dt);
    if (event === "reveal" || event === "match" || event === "miss")
      this.ctx.audio.play(event);
    if (event === "match" || event === "win")
      this.sparkles.burst(
        this.position(this.round.current).add(new THREE.Vector3(0, 0.4, 0)),
        0xeac56f,
        this.ctx.calm ? 10 : 35,
      );
    if (event === "win") {
      this.avatar.animator?.trigger("Celebrate");
      this.ctx.audio.play("win");
      this.ctx.hud.result({
        title: "All 12 pairs found!",
        copy: "A lovely round of remembering. A fresh board is ready whenever you are.",
        actions: [
          {
            label: "Play Another Round",
            run: () => this.reset(),
            primary: true,
          },
          { label: "Return to Arcade", run: this.ctx.exit },
        ],
      });
    }
    this.cards.forEach((card, i) => {
      const tile = this.round.tiles[i],
        face = this.round.phase === "preview" || tile.revealed || tile.matched,
        target = face ? 0 : Math.PI;
      card.group.rotation.z = THREE.MathUtils.damp(
        card.group.rotation.z,
        target,
        13,
        dt,
      );
      card.base.material = this.art.mat(tile.matched ? 0xe9bd5b : 0x649d89);
    });
    this.highlight.position.copy(
      this.position(this.round.moving ? this.round.target : this.round.current),
    );
    this.refreshHUD();
  }
  resize(width, height) {
    const aspect = width / height,
      halfHeight = Math.max(6.6, 7.7 / aspect) * (height < 600 ? 1.1 : 1);
    this.camera.left = -halfHeight * aspect;
    this.camera.right = halfHeight * aspect;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    this.camera.updateProjectionMatrix();
  }
  dispose() {
    disposeScene(this.scene, [...this.textures.values(), this.backTexture]);
    this.art.dispose();
    this.cards.length = 0;
  }
}
