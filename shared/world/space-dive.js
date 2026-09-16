import * as THREE from "three";
import { RollerCoaster, rounded, bar, tube } from "./coaster.js";
import { label } from "./models.js";
import { SPACE_ALTITUDE } from "./space.js";
import {
  createSpaceDiveTrack,
  SpaceDiveRide,
  SPACE_DIVE_STATION,
  SPACE_DIVE_EXIT,
  SPACE_DIVE_COLORS,
} from "./space-dive-track.js";

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const EARTH_SKY = new THREE.Color(0xc5e2e0),
  SPACE_SKY = new THREE.Color(0x030716);

export class SpaceDive extends RollerCoaster {
  constructor(game) {
    const track = createSpaceDiveTrack();
    super(game, {
      track,
      ride: new SpaceDiveRide(track),
      id: "space-dive",
      title: "Space Dive",
      exitPoint: SPACE_DIVE_EXIT,
      colors: SPACE_DIVE_COLORS,
    });
    this.hud.classList.add("space-dive-hud");
    this.altitudeLabel = document.createElement("span");
    this.hud.querySelector(".coaster-stats").append(this.altitudeLabel);
    this.spaceMix = 0;
    this.environmentSaved = null;
  }
  buildTrack() {
    const rails = new THREE.MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.5,
      roughness: 0.26,
      emissive: 0x138399,
      emissiveIntensity: 0.45,
    });
    for (const x of [-0.67, 0.67]) {
      const rail = new THREE.Mesh(
        tube(this.track, 0, x, 0.12, SPACE_DIVE_COLORS),
        rails,
      );
      rail.name = "space-dive-continuous-rail";
      rail.castShadow = true;
      this.group.add(rail);
    }
    const spine = new THREE.Mesh(
      tube(this.track, -0.5, 0, 0.23, [0x263951, 0x3a5374]),
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        metalness: 0.4,
        roughness: 0.4,
      }),
    );
    this.group.add(spine);
    const count = Math.floor(this.track.length / 1.5);
    const ties = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1.85, 0.14, 0.22),
      new THREE.MeshStandardMaterial({
        color: 0xd7ebff,
        metalness: 0.45,
        roughness: 0.4,
      }),
      count,
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const s = this.track.sample((i / count) * this.track.length);
      dummy.position.copy(s.position).addScaledVector(s.up, -0.18);
      dummy.quaternion.copy(s.rotation);
      dummy.updateMatrix();
      ties.setMatrixAt(i, dummy.matrix);
    }
    ties.castShadow = true;
    this.group.add(ties);
    // Launch pylons support the lower tower; orbit gates mark the upper route.
    for (let d = 25; d < this.track.panoramaStart - 60; d += 30) {
      const s = this.track.sample(d),
        head = s.position.clone().addScaledVector(s.up, -0.8);
      for (const side of [-1, 1]) {
        const foot = head.clone().addScaledVector(s.right, side * 3);
        foot.y = 0.1;
        bar(this.group, foot, head, 0.23, 0x55758c);
        rounded(
          this.group,
          [foot.x, 0.12, foot.z],
          [1.4, 0.3, 1.4],
          0xd3e2e6,
          0.1,
        );
      }
    }
    this.gates = [];
    for (let d = 50; d < this.track.length - 65; d += 48) {
      const s = this.track.sample(d);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(3.6, 0.09, 10, 64),
        new THREE.MeshStandardMaterial({
          color: 0x83e6ff,
          emissive: 0x38cde8,
          emissiveIntensity: 1.2,
          roughness: 0.25,
        }),
      );
      ring.position.copy(s.position).addScaledVector(s.up, 1.3);
      ring.quaternion.copy(s.rotation);
      ring.name = "space-dive-orbit-gate";
      this.group.add(ring);
      this.gates.push(ring);
    }
  }
  buildStation() {
    const { x, z } = SPACE_DIVE_STATION,
      g = this.group;
    rounded(g, [x, 0.04, z + 4.5], [22, 0.12, 14], 0xc8d9e5, 0.05);
    rounded(g, [x, 0.12, z + 3.4], [15, 0.14, 4.5], 0xeff8ff, 0.05);
    for (const xx of [x - 8, x + 8]) {
      rounded(g, [xx, 2.3, z + 4.6], [0.38, 4.6, 0.38], 0x314862, 0.12);
      rounded(g, [xx, 2.3, z + 4.84], [0.12, 3.7, 0.05], 0x65efff, 0.02);
      this.game.areas.town.colliders.push({
        minX: xx - 0.22,
        maxX: xx + 0.22,
        minZ: z + 4.3,
        maxZ: z + 4.9,
        maxY: 4.6,
      });
    }
    rounded(g, [x, 4.65, z + 4.6], [17, 0.9, 0.45], 0x172c4b, 0.2);
    label(g, "SPACE DIVE", x, 4.66, z + 4.84, 10, "#172c4b", "#a4f6ff");
    label(
      g,
      "GROUND → SPACE → HOME",
      x,
      3.92,
      z + 4.86,
      6.4,
      "#203857",
      "#e2eafa",
    );
    label(
      g,
      "BOARD HERE · E",
      x + 5.2,
      1.6,
      z + 4.5,
      3.7,
      "#eff8ff",
      "#263b5f",
    );
    for (const xx of [x - 5, x + 5]) {
      bar(g, v(xx, 0.1, z + 1.8), v(xx, 1.15, z + 1.8), 0.055, 0x65bacb);
      bar(g, v(xx, 1.15, z + 1.8), v(xx, 1.15, z + 4), 0.055, 0x65bacb);
    }
    for (const side of [-1, 1]) {
      rounded(
        g,
        [x + side * 9.4, 0.35, z + 6],
        [1.4, 0.7, 3.2],
        0x546780,
        0.15,
      );
      rounded(
        g,
        [x + side * 9.4, 0.74, z + 6],
        [1.4, 0.12, 3.2],
        0x9bddf4,
        0.06,
      );
    }
    // The approach runs east of Rainbow Rush, then turns west to the station.
    rounded(g, [88, 0.015, -89], [3, 0.07, 66], 0xdfdac6, 0.025);
    rounded(g, [74, 0.02, -113], [28, 0.07, 3], 0xdfdac6, 0.025);
    label(g, "SPACE DIVE ↑", 83, 2.1, -88, 5, "#193558", "#a4f6ff");
    bar(g, v(83, 0, -88), v(83, 1.8, -88), 0.065, 0x45627d);
    for (let zz = -112; zz <= -68; zz += 11) {
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0x7eeeff }),
      );
      light.position.set(86.3, 0.9, zz);
      g.add(light);
      bar(g, v(86.3, 0, zz), v(86.3, 0.75, zz), 0.055, 0x45627d);
    }
  }
  board() {
    if (this.occupied) return;
    super.board();
    if (!this.occupied) return;
    const g = this.game;
    this.environmentSaved = {
      spaceVisible: g.areas.space.group.visible,
      background: g.scene.background.clone(),
      fogColor: g.scene.fog.color.clone(),
      fogNear: g.scene.fog.near,
      fogFar: g.scene.fog.far,
      environment: g.scene.environmentIntensity,
      sky: g.skyLight.intensity,
      sun: g.sun.intensity,
      exposure: g.renderer.toneMappingExposure,
      far: g.camera.far,
    };
    g.camera.far = 500;
    g.camera.updateProjectionMatrix();
    g.ui.toast("Space Dive! Boarded and ready. E launches your trip.");
  }
  updateHUD() {
    super.updateHUD();
    if (this.altitudeLabel)
      this.altitudeLabel.textContent = `${Math.round(this.track.sample(this.ride.distance).position.y)} m altitude`;
  }
  updateCamera(dt) {
    super.updateCamera(dt);
    const g = this.game;
    if (this.view === "follow") {
      const d = this.ride.distance;
      const blend =
        THREE.MathUtils.smoothstep(
          d,
          this.track.panoramaStart - 14,
          this.track.panoramaStart + 6,
        ) *
        (1 -
          THREE.MathUtils.smoothstep(
            d,
            this.track.panoramaEnd - 14,
            this.track.panoramaEnd + 6,
          ));
      if (blend > 0) {
        const s = this.track.sample(d);
        const scenic = s.position.clone().add(v(10, 6, -12));
        g.camera.position.lerp(scenic, blend * (1 - Math.exp(-4 * dt)));
        const target = s.position
          .clone()
          .add(v(0, 1, 0))
          .lerp(v(-18, SPACE_ALTITUDE + 8, 55), blend * 0.7);
        g.camera.up.set(0, 1, 0);
        g.camera.lookAt(target);
      }
    }
    g.camera.fov = Math.min(g.camera.fov, g.calm ? 55 : 72);
    g.camera.updateProjectionMatrix();
  }
  applyEnvironment() {
    if (!this.occupied) return;
    const g = this.game,
      y = g.player.position.y;
    this.spaceMix = THREE.MathUtils.smoothstep(y, 70, SPACE_ALTITUDE - 4);
    g.areas.space.group.visible = this.spaceMix > 0.04;
    g.scene.background.copy(EARTH_SKY).lerp(SPACE_SKY, this.spaceMix);
    g.scene.fog.color.copy(g.scene.background);
    g.scene.fog.near = THREE.MathUtils.lerp(150, 110, this.spaceMix);
    g.scene.fog.far = THREE.MathUtils.lerp(360, 300, this.spaceMix);
    g.scene.environmentIntensity = THREE.MathUtils.lerp(1, 0.3, this.spaceMix);
    g.skyLight.intensity = THREE.MathUtils.lerp(2.2, 0.35, this.spaceMix);
    g.sun.intensity = THREE.MathUtils.lerp(3.2, 1.1, this.spaceMix);
    g.renderer.toneMappingExposure = THREE.MathUtils.lerp(
      0.95,
      0.78,
      this.spaceMix,
    );
    g.sun.target.position.copy(g.player.position);
    g.sun.target.updateMatrixWorld();
  }
  exit() {
    if (!this.occupied) return;
    super.exit();
    const g = this.game,
      s = this.environmentSaved;
    if (s) {
      g.areas.space.group.visible = s.spaceVisible;
      g.scene.background.copy(s.background);
      g.scene.fog.color.copy(s.fogColor);
      g.scene.fog.near = s.fogNear;
      g.scene.fog.far = s.fogFar;
      g.scene.environmentIntensity = s.environment;
      g.skyLight.intensity = s.sky;
      g.sun.intensity = s.sun;
      g.renderer.toneMappingExposure = s.exposure;
      g.camera.far = s.far;
      g.camera.updateProjectionMatrix();
    }
    this.spaceMix = 0;
    this.environmentSaved = null;
  }
}
