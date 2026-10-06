import * as THREE from "three";
import { RollerCoaster, rounded, bar } from "./coaster.js";
import {
  createWaterSlide,
  WaterSlideRide,
  WATER_COLORS,
  WATER_PARK_EXIT,
  WATER_SLIDES,
  WATER_POOL,
  insideWaterPark,
} from "./water-park-track.js";
import { buildWaterTracks, buildWaterPark } from "./water-park-scenery.js";
const v = (x, y, z) => new THREE.Vector3(x, y, z);

export class WaterPark extends RollerCoaster {
  constructor(game) {
    const track = createWaterSlide(0);
    super(game, {
      track,
      ride: new WaterSlideRide(track),
      id: "water-park",
      title: "Rainbow Rapids",
      exitPoint: WATER_PARK_EXIT,
      colors: WATER_COLORS,
    });
    // Three actual ground entrances; no invisible shared selector at the arch.
    game.interactions.items = game.interactions.items.filter(
      (item) => item.id !== "water-park",
    );
    WATER_SLIDES.forEach((slide, index) =>
      game.interactions.register({
        id: `water-lift-${index}`,
        kind: "water-lift",
        area: "town",
        ...slide.entry,
        radius: 5,
        slide: index,
        label: `${index + 1} · Board ${slide.name}`,
        hint: `E · Lift to ${slide.height} m · start when ready`,
      }),
    );
    game.interactions.on("water-lift", (item) => this.board(item.slide));
    this.time = 0;
    this.splashTime = 0;
    this.swimYaw = Math.PI;
    this.cars[0].visible = false;
  }
  get swimming() {
    return this.ride.state === "swimming";
  }
  buildTrack() {
    this.tracks = [this.track, createWaterSlide(1), createWaterSlide(2)];
    buildWaterTracks(this);
  }
  buildStation() {
    buildWaterPark(this);
  }
  buildTrain() {
    const raft = new THREE.Group();
    this.group.add(raft);
    this.cars = [raft];
    const tube = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.3, 12, 36),
      new THREE.MeshStandardMaterial({ color: 0xffda37, roughness: 0.45 }),
    );
    tube.rotation.x = Math.PI / 2;
    tube.position.y = -1;
    raft.add(tube);
    rounded(raft, [0, -1.13, 0], [1.3, 0.18, 1.5], 0xef498f, 0.08);
    for (const x of [-0.8, 0.8])
      bar(raft, v(x, -0.8, -0.2), v(x, -0.8, 0.3), 0.07, 0x584097);
  }
  buildHUD() {
    super.buildHUD();
    this.hud.classList.add("water-park-hud");
    this.description = document.createElement("p");
    this.description.className = "water-ride-description";
    this.hud.insertBefore(
      this.description,
      this.hud.querySelector(".coaster-stats"),
    );
    this.swimHint = document.createElement("p");
    this.swimHint.className = "water-swim-hint";
    this.swimHint.textContent =
      "WASD / arrows or the touch stick to swim. Follow the yellow floats to the steps. You float safely; take your time.";
    this.swimHint.hidden = true;
    this.hud.append(this.swimHint);
    this.view = "follow";
    this.viewButton.textContent = "View: outside raft · C";
  }
  poseRider() {
    this.poseBones = [];
    this.game.player.model.traverse((node) => {
      if (node.isBone)
        this.poseBones.push({ node, rotation: node.rotation.clone() });
    });
    super.poseRider();
  }
  restorePose() {
    this.poseBones?.forEach(({ node, rotation }) =>
      node.rotation.copy(rotation),
    );
  }
  board(index = 0) {
    const g = this.game;
    if (
      this.occupied ||
      g.player.inVehicle ||
      g.driving ||
      g.flying ||
      g.cornMaze?.occupied ||
      g.area.id !== "town" ||
      g.mode !== "playing" ||
      !this.tracks[index]
    )
      return;
    this.track = this.tracks[index];
    this.ride = new WaterSlideRide(this.track);
    this.exitPoint = WATER_SLIDES[index].entry;
    this.liftOrigin = v(this.exitPoint.x, 2, this.exitPoint.z);
    super.board();
    if (!this.occupied) return;
    g.player.model.position.set(0, -1, -0.24);
    this.cars[0].visible = true;
    this.placeTrain();
    this.updateHUD();
    g.mobileControls?.refresh();
    g.ui.toast(
      `${WATER_SLIDES[index].name}: take the lift, then press Start slide at the top.`,
    );
  }
  launch() {
    if (this.ride.state !== "seated") return;
    if (this.ride.launch()) {
      this.game.input.clear();
      this.game.canvas.focus();
      this.game.audio?.oneShot("confirm", 0.2);
      this.updateHUD();
    }
  }
  toggleView() {
    this.view = this.view === "front" ? "follow" : "front";
    this.viewButton.textContent = `View: ${this.view === "front" ? "in the tube" : "outside raft"} · C`;
    this.game.canvas.focus();
  }
  placeTrain() {
    const car = this.cars[0],
      state = this.ride.state;
    if (state === "swimming" || state === "climbing") return;
    if (state === "lifting" && this.liftOrigin) {
      const t = THREE.MathUtils.smoothstep(this.ride.liftTime / 5, 0, 1);
      car.position.copy(this.liftOrigin).lerp(this.track.points[0], t);
      car.quaternion.copy(this.track.rotations[0]);
    } else if (state === "dropping") {
      car.position.copy(this.ride.dropPosition ?? this.track.points.at(-1));
      car.quaternion.identity();
    } else {
      const s = this.track.sample(this.ride.distance);
      car.position.copy(s.position);
      car.quaternion.copy(s.rotation);
    }
    if (this.occupied) this.game.player.position.copy(car.position);
    this.lifts?.forEach((lift, i) => {
      lift.visible = state === "lifting" && i === this.track.index;
      if (lift.visible) lift.position.copy(car.position);
    });
  }
  enterPool() {
    const g = this.game;
    this.savedParent.add(g.player.model);
    g.player.model.visible = true;
    this.restorePose();
    this.cars[0].visible = false;
    g.player.position.copy(this.ride.swimmer);
    g.player.model.position.copy(g.player.position);
    g.player.model.rotation.set(0, 0, 0);
    g.input.clear();
    this.swimYaw = Math.PI;
    this.splashTime = 1.2;
    this.splashOrigin = g.player.position.clone();
    g.camera.up.set(0, 1, 0);
    g.ui.toast("Splash! Swim to the yellow steps to get out.");
    g.audio?.oneShot("land", 0.22);
  }
  animateSwimmer(moving) {
    const g = this.game,
      phase = this.ride.swimTime * 5;
    for (const { node, rotation } of this.poseBones ?? []) {
      node.rotation.copy(rotation);
      const side = /L$|[._-]L$/i.test(node.name) ? 1 : -1;
      if (/upper.?arm|DEF-upper_arm/i.test(node.name)) {
        node.rotation.x =
          -0.9 + (moving ? Math.sin(phase + (side * Math.PI) / 2) * 0.6 : 0);
        node.rotation.z += side * 0.25;
      }
      if (/thigh/i.test(node.name))
        node.rotation.x = moving
          ? Math.sin(phase + (side * Math.PI) / 2) * 0.22
          : 0;
    }
    g.player.model.position.copy(g.player.position);
    g.player.model.position.y += Math.sin(this.ride.swimTime * 2) * 0.045;
    g.player.model.rotation.x = moving ? 0.3 : 0;
  }
  update(dt) {
    if (!this.occupied) return;
    const g = this.game,
      old = this.ride.state;
    this.ride.gentle = g.calm;
    if (g.input.consume("KeyC") && !this.swimming) this.toggleView();
    if (g.input.consume("KeyE") && this.ride.state === "seated") this.launch();
    this.ride.update(dt);
    if (this.swimming) {
      if (old !== "swimming") this.enterPool();
      this.swimYaw -= g.input.lookX * 0.003;
      g.input.lookX = g.input.lookY = 0;
      const side =
        Number(g.input.down("KeyD", "ArrowRight")) -
        Number(g.input.down("KeyA", "ArrowLeft"));
      const forward =
        Number(g.input.down("KeyW", "ArrowUp")) -
        Number(g.input.down("KeyS", "ArrowDown"));
      const dx =
        Math.cos(this.swimYaw) * side - Math.sin(this.swimYaw) * forward;
      const dz =
        -Math.sin(this.swimYaw) * side - Math.cos(this.swimYaw) * forward;
      const reachedSteps = this.ride.swim(dt, dx, dz);
      g.player.position.copy(this.ride.swimmer);
      if (side || forward) g.player.model.rotation.y = Math.atan2(dx, dz);
      this.animateSwimmer(!!(side || forward));
      if (reachedSteps) {
        this.ride.state = "climbing";
        this.ride.phase = "Up the steps · welcome back!";
        this.climbTime = 0;
        this.climbStart = g.player.position.clone();
      }
    } else if (this.ride.state === "climbing") {
      this.climbTime += Math.min(dt, 0.1);
      const t = Math.min(this.climbTime / 1.6, 1);
      g.player.position
        .copy(this.climbStart)
        .lerp(v(WATER_POOL.shoreX, 0, WATER_POOL.shoreZ), t);
      g.player.position.y += Math.sin(t * Math.PI) * 1.5;
      g.player.model.position.copy(g.player.position);
      g.player.model.rotation.x = 0;
      if (t === 1) {
        this.exit(true);
        return;
      }
    } else this.placeTrain();
    this.updateHUD();
    if (this.ride.state !== old) g.mobileControls?.refresh();
  }
  updateHUD() {
    if (!this.description) return;
    const state = this.ride.state,
      slide = WATER_SLIDES[this.track.index],
      inPool = state === "swimming" || state === "climbing";
    this.hud.classList.toggle("is-swimming", inPool);
    this.swimHint.hidden = !inPool;
    this.hud.querySelector(".coaster-eyebrow").textContent =
      `${this.track.index + 1} · ${slide.name}`;
    if (this.phase.textContent !== this.ride.phase)
      this.phase.textContent = this.ride.phase;
    this.description.textContent = slide.description;
    this.description.hidden = inPool;
    this.speedLabel.textContent = inPool
      ? "Float safely · no timer"
      : `${Math.round(this.game.player.position.y)} m high`;
    this.progress.textContent =
      state === "riding"
        ? `${Math.floor((this.ride.distance / this.track.length) * 100)}% · ${Math.round(this.ride.speed * 3.6)} km/h`
        : state === "lifting"
          ? "Going up"
          : inPool
            ? `${Math.round(Math.hypot(this.game.player.position.x - WATER_POOL.exitX, this.game.player.position.z - WATER_POOL.exitZ))} m to steps`
            : state === "dropping"
              ? "Into the pool!"
              : "Ready when you are";
    this.launchButton.hidden = state !== "seated";
    this.launchButton.textContent = "Start slide · E";
    this.viewButton.hidden = inPool || state === "lifting";
    this.exitButton.textContent = inPool
      ? "Help me out"
      : "Return to this lift";
  }
  updateCamera(dt) {
    const g = this.game,
      state = this.ride.state;
    if (state === "swimming" || state === "climbing") {
      const target = g.player.position.clone().add(v(0, 1, 0));
      const desired = target
        .clone()
        .add(v(Math.sin(this.swimYaw) * 8, 4, Math.cos(this.swimYaw) * 8));
      g.camera.position.lerp(desired, 1 - Math.exp(-7 * dt));
      g.camera.up.set(0, 1, 0);
      g.camera.lookAt(target);
      g.camera.fov = 58;
      g.player.model.visible = true;
      g.follow.yaw = this.swimYaw;
    } else if (state === "lifting") {
      g.camera.position.copy(this.cars[0].position).add(v(8, 4, 10));
      g.camera.up.set(0, 1, 0);
      g.camera.lookAt(this.cars[0].position);
      g.player.model.visible = true;
      g.camera.fov = 60;
    } else {
      const s = this.track.sample(this.ride.distance),
        front = this.view === "front",
        p = this.cars[0].position;
      const vertical = Math.abs(s.tangent.y) > 0.95;
      // Exact vertical drops use a parallel-transported up vector even in calm
      // mode: a world-up vector parallel to the view would make lookAt flip.
      const up = g.calm && !vertical ? v(0, 1, 0) : s.up;
      if (front && state !== "dropping") {
        g.camera.position.copy(p);
        g.camera.up.copy(up);
        const ahead = this.track.sample(this.ride.distance + 2.5).position;
        if (ahead.distanceToSquared(p) < 0.01) ahead.copy(p).add(s.tangent);
        g.camera.lookAt(ahead);
        g.player.model.visible = false;
      } else {
        const bowl = this.track.inBowl(this.ride.distance),
          offset =
            state === "dropping"
              ? v(6, 5, -8)
              : g.calm
                ? v(8, 6, 10)
                : s.tangent
                    .clone()
                    .multiplyScalar(-9)
                    .addScaledVector(up, bowl ? 10 : 6);
        g.camera.position.copy(p).add(offset);
        g.camera.up.copy(g.calm || state === "dropping" ? v(0, 1, 0) : up);
        g.camera.lookAt(p);
        g.player.model.visible = true;
      }
      g.camera.fov = g.calm ? 58 : 65;
    }
    g.camera.updateProjectionMatrix();
  }
  applyEnvironment() {
    const g = this.game,
      near = g.area.id === "town" && insideWaterPark(g.player.position);
    if (near) {
      if (this.parkFar === undefined) this.parkFar = g.camera.far;
      if (g.camera.far !== 720) {
        g.camera.far = 720;
        g.camera.updateProjectionMatrix();
      }
      g.scene.fog.near = 350;
      g.scene.fog.far = 680;
    } else if (this.parkFar !== undefined) {
      g.camera.far = this.parkFar;
      g.camera.updateProjectionMatrix();
      this.parkFar = undefined;
    }
    if (!this.occupied) return;
    const blend = THREE.MathUtils.smoothstep(g.player.position.y, 160, 260);
    g.scene.background.set(0xc5e2e0).lerp(new THREE.Color(0x10183b), blend);
    g.scene.fog.color.copy(g.scene.background);
  }
  exit(completed = false) {
    if (!this.occupied) return;
    const g = this.game;
    this.restorePose();
    this.lifts.forEach((lift) => (lift.visible = false));
    this.exitPoint = completed
      ? { x: WATER_POOL.shoreX, z: WATER_POOL.shoreZ }
      : WATER_SLIDES[this.track.index].entry;
    // A rescue from swimming goes to the dry pool steps, not back up a tower.
    if (this.swimming || this.ride.state === "climbing")
      this.exitPoint = { x: WATER_POOL.shoreX, z: WATER_POOL.shoreZ };
    super.exit();
    if (this.parkFar !== undefined) {
      g.camera.far = this.parkFar;
      g.camera.updateProjectionMatrix();
      this.parkFar = undefined;
    }
    this.cars[0].visible = false;
    this.hud.classList.remove("is-swimming");
    g.mobileControls?.refresh();
    g.player.model.animator?.reset();
    this.poseBones = [];
    this.splashTime = 0;
    this.splash.visible = false;
    g.scene.background.set(0xc5e2e0);
    g.scene.fog.color.copy(g.scene.background);
    g.ui.toast(
      completed
        ? "You swam out! Follow a colored path to ride again."
        : "Back on dry land. Explore at your own pace.",
    );
  }
  animateWater(dt) {
    if (
      this.game.area.id !== "town" ||
      (!insideWaterPark(this.game.player.position) &&
        this.game.player.position.distanceTo(v(-169, 0, -200)) > 350)
    )
      return;
    this.time += dt;
    this.waterTexture.offset.x = -this.time * (this.game.calm ? 0.7 : 2.7);
    this.poolTexture.offset.x = -this.time * 0.07;
    for (let i = 0; i < this.foam.count; i++) {
      const track = this.tracks[i % 3],
        d = (i * 11.91 + this.time * (this.game.calm ? 8 : 25)) % track.length,
        s = track.sample(d);
      this.foamDummy.position
        .copy(s.position)
        .addScaledVector(s.up, track.inBowl(d) ? -1.28 : -2.05)
        .addScaledVector(s.right, Math.sin(i * 8) * 0.5);
      this.foamDummy.scale.set(0.8, 0.6, 2.6);
      this.foamDummy.quaternion.copy(s.rotation);
      this.foamDummy.updateMatrix();
      this.foam.setMatrixAt(i, this.foamDummy.matrix);
    }
    this.foam.instanceMatrix.needsUpdate = true;
    this.fountains.forEach(
      (jet, i) => (jet.scale.y = 1 + Math.sin(this.time * 2 + i) * 0.12),
    );
    this.splashTime = Math.max(0, this.splashTime - dt);
    this.splash.visible = this.splashTime > 0;
    if (this.splash.visible) {
      const t = 1.2 - this.splashTime;
      for (let i = 0; i < this.splash.count; i++) {
        const a = (i / this.splash.count) * Math.PI * 2;
        this.foamDummy.position.set(
          this.splashOrigin.x + Math.sin(a) * t * 4,
          WATER_POOL.surface +
            Math.max(0, Math.sin((t / 1.2) * Math.PI) * (1 + (i % 4) * 0.4)),
          this.splashOrigin.z + Math.cos(a) * t * 4,
        );
        this.foamDummy.scale.setScalar(1 - t / 1.3);
        this.foamDummy.updateMatrix();
        this.splash.setMatrixAt(i, this.foamDummy.matrix);
      }
      this.splash.instanceMatrix.needsUpdate = true;
    }
  }
}
