import * as THREE from "three";
import { blob, box, cylinder, label, material } from "./models.js";
import { SPACE_ALTITUDE, SPACE_LANDING_SITE } from "./space.js";

export const ROCKET_SITE = Object.freeze({
  x: 65,
  z: 48,
  platformY: 4.25,
  ladderNearZ: 51.25,
  ladderFarZ: 57,
  doorZ: 49.48,
});

export const ROCKET_BOUNDS = Object.freeze({
  minX: 58,
  maxX: 72,
  minZ: 39,
  maxZ: 58,
});

export const ROCKET_PHASES = Object.freeze({
  boardingEnd: 1.2,
  ignitionEnd: 3.2,
  ascentEnd: 9.2,
  coastEnd: 12,
  landingEnd: 16.5,
});

const TOWN_SKY = new THREE.Color(0xc5e2e0);
const SPACE_SKY = new THREE.Color(0x030716);

function easeInOut(value) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

export function rocketSurfaceHeight(x, z) {
  const dx = Math.abs(x - ROCKET_SITE.x);
  const platformMinZ = ROCKET_SITE.z + 0.75;
  if (dx <= 2.55 && z >= platformMinZ && z <= ROCKET_SITE.ladderNearZ)
    return ROCKET_SITE.platformY;
  if (dx <= 0.9 && z > ROCKET_SITE.ladderNearZ && z <= ROCKET_SITE.ladderFarZ) {
    const progress =
      (ROCKET_SITE.ladderFarZ - z) /
      (ROCKET_SITE.ladderFarZ - ROCKET_SITE.ladderNearZ);
    return progress * ROCKET_SITE.platformY;
  }
  return 0;
}

function rocketMaterial(color, emissive = 0x000000, intensity = 0) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: intensity,
    roughness: 0.58,
    metalness: 0.18,
    flatShading: true,
  });
}

function makeExhaust() {
  const exhaust = new THREE.Group();
  exhaust.name = "rocket-fire";
  exhaust.visible = false;

  const outerMaterial = new THREE.MeshBasicMaterial({
    color: 0xff7438,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
  const innerMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff0a1,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
  });
  const outer = new THREE.Mesh(
    new THREE.ConeGeometry(0.88, 5.4, 14),
    outerMaterial,
  );
  outer.position.y = -2.45;
  outer.name = "rocket-outer-flame";
  exhaust.add(outer);
  const inner = new THREE.Mesh(
    new THREE.ConeGeometry(0.48, 3.8, 12),
    innerMaterial,
  );
  inner.position.y = -1.7;
  inner.name = "rocket-inner-flame";
  exhaust.add(inner);

  const sparkPositions = new Float32Array(30 * 3);
  const sparks = new THREE.Points(
    new THREE.BufferGeometry(),
    new THREE.PointsMaterial({
      color: 0xffc34d,
      size: 0.2,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  sparks.geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(sparkPositions, 3),
  );
  sparks.name = "rocket-fire-sparks";
  exhaust.add(sparks);

  const glow = new THREE.PointLight(0xff9d4f, 0, 24, 2);
  glow.position.y = -1.2;
  glow.name = "rocket-fire-glow";
  exhaust.add(glow);
  exhaust.userData = { outer, inner, sparks, glow };
  return exhaust;
}

export function makeRocket() {
  const rocket = new THREE.Group();
  rocket.name = "starbound-rocket";

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(1.28, 1.42, 7.4, 24),
    rocketMaterial(0xeee9dc),
  );
  body.position.y = 4.65;
  body.castShadow = body.receiveShadow = true;
  body.name = "rocket-body";
  rocket.add(body);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(1.29, 2.75, 24),
    rocketMaterial(0xe66f58),
  );
  nose.position.y = 9.72;
  nose.castShadow = true;
  nose.name = "rocket-nose";
  rocket.add(nose);

  const engine = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.48, 0.85, 20),
    rocketMaterial(0x4e6470),
  );
  engine.position.y = 0.55;
  engine.name = "rocket-engine";
  rocket.add(engine);

  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 3.4, 3),
      rocketMaterial(0xd9584d),
    );
    fin.position.set(side * 1.42, 1.45, -0.2);
    fin.rotation.z = side * Math.PI * 0.52;
    fin.rotation.y = Math.PI / 2;
    fin.scale.z = 0.46;
    fin.castShadow = true;
    fin.name = "rocket-fin";
    rocket.add(fin);
  }

  const windowFrame = cylinder(
    rocket,
    0,
    6.55,
    1.38,
    0.59,
    0.59,
    0.18,
    0x395a70,
    24,
  );
  windowFrame.rotation.x = Math.PI / 2;
  windowFrame.name = "rocket-window-frame";
  const windowGlass = cylinder(
    rocket,
    0,
    6.55,
    1.49,
    0.43,
    0.43,
    0.05,
    0x8cd9e2,
    24,
  );
  windowGlass.rotation.x = Math.PI / 2;
  windowGlass.name = "rocket-window";

  const door = box(rocket, 0, 4.32, 1.4, 1.28, 2.05, 0.14, 0x486d7c);
  door.name = "rocket-door";
  for (const x of [-0.72, 0.72])
    box(rocket, x, 4.32, 1.43, 0.1, 2.24, 0.12, 0xf3ca62);
  for (const y of [3.23, 5.41])
    box(rocket, 0, y, 1.43, 1.54, 0.1, 0.12, 0xf3ca62);
  blob(rocket, 0.42, 4.28, 1.56, 0.09, 0xffe28c, 1).name = "rocket-door-handle";

  const band = new THREE.Mesh(
    new THREE.TorusGeometry(1.35, 0.12, 8, 28),
    material(0xe7b74e),
  );
  band.rotation.x = Math.PI / 2;
  band.position.y = 7.7;
  band.name = "rocket-gold-band";
  rocket.add(band);

  const exhaust = makeExhaust();
  exhaust.position.y = 0.15;
  rocket.add(exhaust);
  rocket.userData.exhaust = exhaust;
  rocket.userData.body = body;
  rocket.userData.door = door;
  return rocket;
}

function addCollider(area, x, z, width, depth, minY, maxY) {
  const collider = {
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
    minY,
    maxY,
  };
  area.colliders.push(collider);
  return collider;
}

function makeLadder(parent) {
  const centerZ = (ROCKET_SITE.ladderNearZ + ROCKET_SITE.ladderFarZ) / 2;
  const rise = ROCKET_SITE.platformY;
  const run = ROCKET_SITE.ladderFarZ - ROCKET_SITE.ladderNearZ;
  const length = Math.hypot(rise, run);
  const angle = -Math.atan2(run, rise);
  for (const xOffset of [-0.68, 0.68]) {
    const rail = box(
      parent,
      ROCKET_SITE.x + xOffset,
      rise / 2,
      centerZ,
      0.14,
      length,
      0.14,
      0xe7c260,
    );
    rail.rotation.x = angle;
    rail.name = "rocket-ladder-rail";
  }
  for (let rung = 0; rung <= 10; rung++) {
    const progress = rung / 10;
    const step = box(
      parent,
      ROCKET_SITE.x,
      progress * rise + 0.04,
      THREE.MathUtils.lerp(
        ROCKET_SITE.ladderFarZ,
        ROCKET_SITE.ladderNearZ,
        progress,
      ),
      1.55,
      0.13,
      0.28,
      0xf3d27a,
    );
    step.rotation.x = angle;
    step.name = "rocket-ladder-rung";
  }
}

export function buildRocketLaunchSite(area) {
  const g = area.group;
  cylinder(
    g,
    ROCKET_SITE.x,
    0.12,
    ROCKET_SITE.z,
    7.2,
    7.2,
    0.22,
    0x6f7c7d,
    40,
  ).name = "rocket-launch-pad";
  const safetyRing = new THREE.Mesh(
    new THREE.RingGeometry(5.65, 6.15, 48),
    new THREE.MeshBasicMaterial({
      color: 0xf4cf63,
      side: THREE.DoubleSide,
    }),
  );
  safetyRing.position.set(ROCKET_SITE.x, 0.245, ROCKET_SITE.z);
  safetyRing.rotation.x = -Math.PI / 2;
  safetyRing.name = "rocket-launch-safety-ring";
  g.add(safetyRing);

  box(
    g,
    ROCKET_SITE.x,
    ROCKET_SITE.platformY - 0.13,
    ROCKET_SITE.z + 2.02,
    5.2,
    0.26,
    2.45,
    0x4e6a72,
  ).name = "rocket-boarding-platform";
  for (const xOffset of [-2.35, 2.35]) {
    box(
      g,
      ROCKET_SITE.x + xOffset,
      ROCKET_SITE.platformY / 2,
      ROCKET_SITE.z + 2.05,
      0.24,
      ROCKET_SITE.platformY,
      0.24,
      0x3c5961,
    );
    box(
      g,
      ROCKET_SITE.x + xOffset,
      ROCKET_SITE.platformY + 0.72,
      ROCKET_SITE.z + 2.05,
      0.12,
      1.45,
      2.2,
      0xf0cf70,
    );
  }
  for (const xOffset of [-2.4, 2.4])
    addCollider(
      area,
      ROCKET_SITE.x + xOffset,
      ROCKET_SITE.z + 2.05,
      0.35,
      2.55,
      0,
      ROCKET_SITE.platformY + 1.5,
    );
  addCollider(
    area,
    ROCKET_SITE.x,
    ROCKET_SITE.z + 0.75,
    5.2,
    0.3,
    0,
    ROCKET_SITE.platformY,
  );
  // The front rail is split so the ladder opens directly onto the platform.
  for (const xOffset of [-1.75, 1.75])
    addCollider(
      area,
      ROCKET_SITE.x + xOffset,
      ROCKET_SITE.ladderNearZ,
      1.65,
      0.3,
      0,
      ROCKET_SITE.platformY + 1.5,
    );

  makeLadder(g);
  const sign = label(
    g,
    "STARBOUND LAUNCH PAD",
    ROCKET_SITE.x - 4.8,
    2.15,
    ROCKET_SITE.z + 5.6,
    6.5,
    "#fff0b8",
    "#294f59",
  );
  sign.rotation.y = Math.PI / 2;
  box(
    g,
    ROCKET_SITE.x - 4.8,
    1.1,
    ROCKET_SITE.z + 5.6,
    0.12,
    2.2,
    0.12,
    0x42616a,
  );

  const previousGroundHeight = area.groundHeightAt;
  area.groundHeightAt = (x, z) =>
    Math.max(previousGroundHeight?.(x, z) ?? 0, rocketSurfaceHeight(x, z));
  area.rocketSite = {
    bounds: ROCKET_BOUNDS,
    door: {
      x: ROCKET_SITE.x,
      y: ROCKET_SITE.platformY,
      z: ROCKET_SITE.doorZ,
    },
    ladderStart: {
      x: ROCKET_SITE.x,
      y: 0,
      z: ROCKET_SITE.ladderFarZ,
    },
  };
  return area.rocketSite;
}

export class RocketJourney {
  constructor(scene, townArea, spaceArea) {
    this.scene = scene;
    this.townArea = townArea;
    this.spaceArea = spaceArea;
    this.model = makeRocket();
    this.model.position.set(ROCKET_SITE.x, 0.24, ROCKET_SITE.z);
    townArea.group.add(this.model);
    townArea.cameraMeshes.push(this.model.userData.body);
    this.launchCollider = addCollider(
      townArea,
      ROCKET_SITE.x,
      ROCKET_SITE.z,
      2.75,
      2.75,
      0,
      11.5,
    );
    this.active = false;
    this.arrived = false;
    this.elapsed = 0;
    this.spaceRevealed = false;
    this.baseY = 0.24;
  }

  begin(returning = false) {
    if (this.active || returning !== this.arrived) return false;
    this.returning = returning;
    this.scene.attach(this.model);
    this.model.position.set(
      returning ? SPACE_LANDING_SITE.x : ROCKET_SITE.x,
      (returning ? SPACE_ALTITUDE : 0) + this.baseY,
      returning ? SPACE_LANDING_SITE.z : ROCKET_SITE.z,
    );
    this.model.rotation.set(0, 0, 0);
    this.elapsed = 0;
    this.active = true;
    this.spaceRevealed = false;
    this.model.userData.exhaust.visible = false;
    return true;
  }

  skip() {
    if (this.active) this.elapsed = ROCKET_PHASES.landingEnd;
  }

  updateExhaust(intensity, calm) {
    this.audioThrust = intensity;
    const exhaust = this.model.userData.exhaust;
    exhaust.visible = intensity > 0.02;
    if (!exhaust.visible) return;
    const pulse = calm ? 1 : 0.9 + Math.sin(this.elapsed * 21) * 0.1;
    exhaust.userData.outer.scale.set(1, intensity * pulse, 1);
    exhaust.userData.inner.scale.set(1, intensity * (2 - pulse), 1);
    exhaust.userData.glow.intensity = intensity * 4.2;
    const positions = exhaust.userData.sparks.geometry.attributes.position;
    for (let index = 0; index < positions.count; index++) {
      const phase =
        (this.elapsed * (1.4 + (index % 5) * 0.12) + index * 0.37) % 1;
      const spread = phase * (0.35 + (index % 4) * 0.08);
      const angle = index * 2.399;
      positions.setXYZ(
        index,
        Math.cos(angle) * spread,
        -0.5 - phase * 7.5 * intensity,
        Math.sin(angle) * spread,
      );
    }
    positions.needsUpdate = true;
  }

  update(dt, calm = false) {
    if (!this.active) return null;
    this.elapsed = Math.min(this.elapsed + dt, ROCKET_PHASES.landingEnd);
    const t = this.elapsed;
    if (this.returning) return this.updateReturn(calm);
    let stage = "Boarding the rocket";
    let detail = "The door is closing safely.";
    let flame = 0;
    let skyMix = 0;

    if (t < ROCKET_PHASES.boardingEnd) {
      this.model.position.y = this.baseY;
    } else if (t < ROCKET_PHASES.ignitionEnd) {
      const progress =
        (t - ROCKET_PHASES.boardingEnd) /
        (ROCKET_PHASES.ignitionEnd - ROCKET_PHASES.boardingEnd);
      stage = "Engines glowing";
      detail = "Rocket fire is building below.";
      flame = easeInOut(progress);
    } else if (t < ROCKET_PHASES.ascentEnd) {
      const progress =
        (t - ROCKET_PHASES.ignitionEnd) /
        (ROCKET_PHASES.ascentEnd - ROCKET_PHASES.ignitionEnd);
      const eased = progress * progress;
      this.model.position.set(
        ROCKET_SITE.x,
        this.baseY + eased * 210,
        ROCKET_SITE.z,
      );
      stage =
        progress < 0.55 ? "Leaving Crew's Place" : "Crossing the atmosphere";
      detail =
        progress < 0.55
          ? "Look down—the town is getting smaller below."
          : "The blue sky is fading into a field of stars.";
      flame = 1;
      skyMix = easeInOut((progress - 0.28) / 0.72);
    } else if (t < ROCKET_PHASES.coastEnd) {
      const progress =
        (t - ROCKET_PHASES.ascentEnd) /
        (ROCKET_PHASES.coastEnd - ROCKET_PHASES.ascentEnd);
      const eased = easeInOut(progress);
      this.model.position.set(
        THREE.MathUtils.lerp(ROCKET_SITE.x, SPACE_LANDING_SITE.x, eased),
        210 + Math.sin(progress * Math.PI) * 14,
        THREE.MathUtils.lerp(ROCKET_SITE.z, SPACE_LANDING_SITE.z, eased),
      );
      stage = "Entering space";
      detail = "The landing world is coming into view.";
      flame = 0.28;
      skyMix = 1;
      if (!this.spaceRevealed) {
        this.spaceRevealed = true;
        this.townArea.group.visible = false;
        this.spaceArea.group.visible = true;
      }
    } else {
      const progress =
        (t - ROCKET_PHASES.coastEnd) /
        (ROCKET_PHASES.landingEnd - ROCKET_PHASES.coastEnd);
      const eased = easeInOut(progress);
      this.model.position.set(
        SPACE_LANDING_SITE.x,
        THREE.MathUtils.lerp(210, SPACE_ALTITUDE + this.baseY, eased),
        SPACE_LANDING_SITE.z,
      );
      stage = "Landing in space";
      detail = "The landing pad is just below.";
      flame = Math.max(0, 0.72 * (1 - eased));
      skyMix = 1;
    }

    this.updateExhaust(flame, calm);
    return {
      stage,
      detail,
      skyMix,
      progress: t / ROCKET_PHASES.landingEnd,
      arrived: t >= ROCKET_PHASES.landingEnd,
      camera: this.cameraView(),
      background: TOWN_SKY.clone().lerp(SPACE_SKY, skyMix),
    };
  }

  updateReturn(calm) {
    const t = this.elapsed;
    let stage = "Boarding for home";
    let detail = "Settle in. We're heading back to Crew's Place.";
    let flame = 0;
    let skyMix = 1;
    const rocket = this.model.position;
    if (t < ROCKET_PHASES.ignitionEnd) {
      rocket.set(
        SPACE_LANDING_SITE.x,
        SPACE_ALTITUDE + this.baseY,
        SPACE_LANDING_SITE.z,
      );
      if (t >= ROCKET_PHASES.boardingEnd) {
        stage = "Engines glowing";
        detail = "The rocket is ready to lift off from the space pad.";
        flame = easeInOut((t - ROCKET_PHASES.boardingEnd) / 2);
      }
    } else if (t < ROCKET_PHASES.ascentEnd) {
      const p =
        (t - ROCKET_PHASES.ignitionEnd) /
        (ROCKET_PHASES.ascentEnd - ROCKET_PHASES.ignitionEnd);
      rocket.set(
        SPACE_LANDING_SITE.x,
        SPACE_ALTITUDE + this.baseY + 50 * easeInOut(p),
        SPACE_LANDING_SITE.z,
      );
      stage = "Leaving the space landing zone";
      detail = "Watch the space pad fall away beneath the rocket.";
      flame = 1;
    } else if (t < ROCKET_PHASES.coastEnd) {
      const p =
        (t - ROCKET_PHASES.ascentEnd) /
        (ROCKET_PHASES.coastEnd - ROCKET_PHASES.ascentEnd);
      rocket.set(
        THREE.MathUtils.lerp(SPACE_LANDING_SITE.x, ROCKET_SITE.x, easeInOut(p)),
        THREE.MathUtils.lerp(
          SPACE_ALTITUDE + this.baseY + 50,
          150,
          easeInOut(p),
        ),
        THREE.MathUtils.lerp(SPACE_LANDING_SITE.z, ROCKET_SITE.z, easeInOut(p)),
      );
      this.spaceArea.group.visible = false;
      this.townArea.group.visible = true;
      stage = "Returning through the atmosphere";
      detail = "The blue sky returns. Look for the town and runway below.";
      skyMix = 1 - easeInOut(p);
      flame = 0.65;
    } else {
      const p =
        (t - ROCKET_PHASES.coastEnd) /
        (ROCKET_PHASES.landingEnd - ROCKET_PHASES.coastEnd);
      rocket.set(
        ROCKET_SITE.x,
        THREE.MathUtils.lerp(150, this.baseY, easeInOut(p)),
        ROCKET_SITE.z,
      );
      this.spaceArea.group.visible = false;
      this.townArea.group.visible = true;
      stage = "Landing back at Crew's Place";
      detail = "The engines slow our descent onto the original rocket pad.";
      skyMix = 0;
      flame = t >= ROCKET_PHASES.landingEnd ? 0 : 0.8;
    }
    this.updateExhaust(flame, calm);
    const high = t >= ROCKET_PHASES.ascentEnd && rocket.y > 35;
    return {
      stage,
      detail,
      skyMix,
      progress: t / ROCKET_PHASES.landingEnd,
      arrived: t >= ROCKET_PHASES.landingEnd,
      background: TOWN_SKY.clone().lerp(SPACE_SKY, skyMix),
      camera: {
        position: rocket
          .clone()
          .add(
            new THREE.Vector3(high ? 38 : 18, high ? 30 : 12, high ? 44 : 24),
          ),
        target: rocket.clone().add(new THREE.Vector3(0, high ? -12 : 4, 0)),
      },
    };
  }

  cameraView() {
    const t = this.elapsed;
    const rocket = this.model.position;
    if (t < ROCKET_PHASES.ignitionEnd)
      return {
        position: new THREE.Vector3(ROCKET_SITE.x + 15, 10, ROCKET_SITE.z + 19),
        target: new THREE.Vector3(ROCKET_SITE.x, 4.8, ROCKET_SITE.z),
      };
    if (t < ROCKET_PHASES.ascentEnd) {
      const progress =
        (t - ROCKET_PHASES.ignitionEnd) /
        (ROCKET_PHASES.ascentEnd - ROCKET_PHASES.ignitionEnd);
      if (progress < 0.36)
        return {
          position: new THREE.Vector3(
            ROCKET_SITE.x + 19,
            12 + rocket.y * 0.18,
            ROCKET_SITE.z + 24,
          ),
          target: new THREE.Vector3(
            ROCKET_SITE.x,
            rocket.y * 0.72 + 3,
            ROCKET_SITE.z,
          ),
        };
      if (progress < 0.72)
        return {
          position: rocket.clone().add(new THREE.Vector3(38, 28, 42)),
          target: rocket.clone().add(new THREE.Vector3(0, -18, 0)),
        };
      return {
        position: rocket.clone().add(new THREE.Vector3(18, 8, 23)),
        target: rocket.clone().add(new THREE.Vector3(0, 4.8, 0)),
      };
    }
    if (t < ROCKET_PHASES.coastEnd)
      return {
        position: rocket.clone().add(new THREE.Vector3(17, 7, 24)),
        target: rocket.clone().add(new THREE.Vector3(0, 4.5, 0)),
      };
    return {
      position: rocket.clone().add(new THREE.Vector3(15, 12, 20)),
      target: new THREE.Vector3(
        SPACE_LANDING_SITE.x,
        SPACE_ALTITUDE + 3,
        SPACE_LANDING_SITE.z,
      ),
    };
  }

  dockInSpace() {
    if (this.arrived) return;
    this.townArea.group.visible = false;
    this.spaceArea.group.visible = true;
    this.spaceArea.group.attach(this.model);
    this.model.position.set(
      SPACE_LANDING_SITE.x,
      this.baseY,
      SPACE_LANDING_SITE.z,
    );
    this.model.userData.exhaust.visible = false;
    this.active = false;
    this.arrived = true;
    this.townArea.colliders = this.townArea.colliders.filter(
      (collider) => collider !== this.launchCollider,
    );
    this.townArea.cameraMeshes = this.townArea.cameraMeshes.filter(
      (mesh) => mesh !== this.model.userData.body,
    );
    this.spaceArea.cameraMeshes.push(this.model.userData.body);
    this.spaceCollider = {
      minX: SPACE_LANDING_SITE.x - 1.4,
      maxX: SPACE_LANDING_SITE.x + 1.4,
      minZ: SPACE_LANDING_SITE.z - 1.4,
      maxZ: SPACE_LANDING_SITE.z + 1.4,
      minY: SPACE_ALTITUDE,
      maxY: SPACE_ALTITUDE + 11.5,
    };
    this.spaceArea.colliders.push(this.spaceCollider);
  }

  dockInTown() {
    this.townArea.group.visible = true;
    this.spaceArea.group.visible = false;
    this.townArea.group.attach(this.model);
    this.model.position.set(ROCKET_SITE.x, this.baseY, ROCKET_SITE.z);
    this.model.userData.exhaust.visible = false;
    this.active = false;
    this.arrived = false;
    this.spaceArea.colliders = this.spaceArea.colliders.filter(
      (item) => item !== this.spaceCollider,
    );
    this.spaceArea.cameraMeshes = this.spaceArea.cameraMeshes.filter(
      (mesh) => mesh !== this.model.userData.body,
    );
    if (!this.townArea.colliders.includes(this.launchCollider))
      this.townArea.colliders.push(this.launchCollider);
    if (!this.townArea.cameraMeshes.includes(this.model.userData.body))
      this.townArea.cameraMeshes.push(this.model.userData.body);
  }
}
