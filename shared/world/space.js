import * as THREE from "three";
import { createArea } from "./town.js";
import { blob, box, cylinder, label, material } from "./models.js";

// Space is a separate layer above the countryside. Keeping it in its own area
// means a future rocket can switch worlds cleanly without disturbing the town.
export const SPACE_ALTITUDE = 180;
export const SPACE_WORLD_SIZE = 84;
export const SPACE_LANDING_SITE = Object.freeze({ x: 0, z: 12 });
export const SPACE_BOUNDS = Object.freeze({
  minX: -SPACE_WORLD_SIZE / 2,
  maxX: SPACE_WORLD_SIZE / 2,
  minZ: -SPACE_WORLD_SIZE / 2,
  maxZ: SPACE_WORLD_SIZE / 2,
});

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function createStarPositions(count = 420, seed = 7241) {
  const random = seededRandom(seed);
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index++) {
    const angle = random() * Math.PI * 2;
    const radius = 72 + random() * 92;
    // The follow camera looks slightly downward, so most stars sit near the
    // horizon where explorers can actually see them during normal play.
    const height = 2 + random() * 48;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = height;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  return positions;
}

function addSpaceCollider(area, x, z, width, depth, height) {
  area.colliders.push({
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
    minY: SPACE_ALTITUDE,
    maxY: SPACE_ALTITUDE + height,
  });
}

function makeStars(parent) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(createStarPositions(), 3),
  );
  const stars = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xf7f4dc,
      size: 2.15,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.92,
      fog: false,
    }),
  );
  stars.name = "space-star-field";
  parent.add(stars);
}

function makePlanet(parent) {
  const planetMaterial = new THREE.MeshBasicMaterial({
    color: 0x6282d8,
    fog: false,
  });
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(17, 28, 18),
    planetMaterial,
  );
  planet.position.set(-38, 11, 112);
  planet.name = "distant-blue-planet";
  parent.add(planet);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(18.2, 28, 18),
    new THREE.MeshBasicMaterial({
      color: 0x8ca8ff,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
      fog: false,
    }),
  );
  glow.position.copy(planet.position);
  glow.name = "planet-atmosphere";
  parent.add(glow);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(22, 29, 64),
    new THREE.MeshBasicMaterial({
      color: 0xe4c98e,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      fog: false,
    }),
  );
  ring.position.copy(planet.position);
  ring.rotation.x = Math.PI / 2.45;
  ring.rotation.z = -0.28;
  ring.name = "planet-rings";
  parent.add(ring);
}

function makeCrater(parent, x, z, radius, stretch = 1) {
  const shadow = cylinder(
    parent,
    x,
    0.035,
    z,
    radius,
    radius,
    0.055,
    0x565a78,
    28,
  );
  shadow.scale.z = stretch;
  shadow.name = "moon-crater-floor";

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius, Math.max(0.09, radius * 0.08), 8, 28),
    material(0x9aa0b8),
  );
  rim.position.set(x, 0.09, z);
  rim.rotation.x = Math.PI / 2;
  rim.scale.z = stretch;
  rim.receiveShadow = true;
  rim.name = "moon-crater-rim";
  parent.add(rim);
}

function makeLandingPad(parent) {
  const { x, z } = SPACE_LANDING_SITE;
  cylinder(parent, x, 0.1, z, 6.3, 6.3, 0.18, 0x58647e, 48).name =
    "space-landing-pad";
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(4.35, 4.8, 48),
    new THREE.MeshBasicMaterial({
      color: 0x8de2dc,
      side: THREE.DoubleSide,
    }),
  );
  ring.position.set(x, 0.205, z);
  ring.rotation.x = -Math.PI / 2;
  ring.name = "landing-pad-guide-ring";
  parent.add(ring);
  for (let index = 0; index < 8; index++) {
    const angle = (index / 8) * Math.PI * 2;
    const beacon = blob(
      parent,
      x + Math.cos(angle) * 5.35,
      0.35,
      z + Math.sin(angle) * 5.35,
      0.18,
      0xb8fff0,
      1,
    );
    beacon.name = "landing-pad-beacon";
  }
  const padLabel = label(
    parent,
    "SPACE LANDING ZONE",
    x,
    2.15,
    z - 6.35,
    6.6,
    "#dce8ff",
    "#263356",
  );
  padLabel.rotation.y = Math.PI;
}

export function buildSpace(scene) {
  const area = createArea("space", "Space", { ...SPACE_BOUNDS });
  area.groundY = SPACE_ALTITUDE;
  area.spawn = [SPACE_LANDING_SITE.x, SPACE_LANDING_SITE.z];
  area.environment = {
    background: 0x030716,
    fog: 0x070b20,
    fogNear: 72,
    fogFar: 210,
    exposure: 0.78,
  };
  area.futureRocketReady = true;

  const g = area.group;
  g.position.y = SPACE_ALTITUDE;
  g.visible = false;
  scene.add(g);

  const ground = box(
    g,
    0,
    -0.5,
    0,
    SPACE_WORLD_SIZE + 8,
    1,
    SPACE_WORLD_SIZE + 8,
    0x777c96,
  );
  ground.name = "walkable-space-ground";
  ground.receiveShadow = true;

  // A soft patchwork keeps the moon surface readable without making walking
  // unpredictable. Every decorative patch remains flat and fully traversable.
  for (const [x, z, radius, color] of [
    [-23, -18, 13, 0x858ba4],
    [21, -22, 11, 0x6d738e],
    [-25, 24, 10, 0x8e92a8],
    [24, 23, 14, 0x747991],
  ]) {
    const patch = cylinder(g, x, 0.012, z, radius, radius, 0.025, color, 28);
    patch.scale.z = 0.7;
    patch.name = "moon-surface-patch";
  }

  for (const crater of [
    [-24, -18, 4.6, 0.7],
    [22, -22, 3.2, 1.15],
    [28, 28, 5.2, 0.72],
    [-29, 25, 2.8, 1.25],
    [11, -8, 1.8, 0.8],
    [-11, 31, 1.5, 1.1],
  ])
    makeCrater(g, ...crater);

  makeLandingPad(g);
  makeStars(g);
  makePlanet(g);

  for (const [x, z, size, color] of [
    [-33, -30, 2.5, 0x666b83],
    [34, -10, 3.1, 0x8b8fa4],
    [-35, 7, 2, 0x70758d],
    [18, 35, 2.4, 0x9295aa],
    [35, 34, 1.65, 0x686d86],
    [-16, -35, 1.7, 0x979bad],
  ]) {
    const rock = blob(g, x, size * 0.56, z, size, color, 1);
    rock.scale.set(1, 0.62, 0.82);
    rock.rotation.y = (x + z) * 0.08;
    rock.name = "space-rock";
    area.cameraMeshes.push(rock);
    addSpaceCollider(area, x, z, size * 1.65, size * 1.35, size * 1.2);
  }

  // Low boundary ridges keep the platform edge visually clear while the
  // rectangular physics bounds provide a dependable safety barrier.
  for (let offset = -36; offset <= 36; offset += 8) {
    for (const side of [-1, 1]) {
      const northRock = blob(
        g,
        offset,
        0.55,
        side * 43.5,
        1.25 + (Math.abs(offset) % 3) * 0.18,
        0x686d83,
      );
      northRock.scale.y = 0.52;
      const eastRock = blob(
        g,
        side * 43.5,
        0.55,
        offset,
        1.25 + (Math.abs(offset + 1) % 3) * 0.18,
        0x686d83,
      );
      eastRock.scale.y = 0.52;
    }
  }

  const spaceLight = new THREE.HemisphereLight(0xbecbff, 0x25233c, 1.3);
  spaceLight.name = "space-fill-light";
  g.add(spaceLight);
  const planetLight = new THREE.DirectionalLight(0xaebfff, 2.4);
  planetLight.position.set(-28, 44, -35);
  planetLight.target.position.set(0, 0, 5);
  planetLight.name = "space-key-light";
  g.add(planetLight, planetLight.target);

  area.spaceFeatures = Object.freeze({
    altitude: SPACE_ALTITUDE,
    worldSize: SPACE_WORLD_SIZE,
    starCount: 420,
    hasPlanet: true,
    hasLandingPad: true,
  });
  return area;
}
