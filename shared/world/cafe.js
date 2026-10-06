import * as THREE from "three";
import { createArea, BUILDINGS } from "./town.js";
import { box, collider, label } from "./models.js";
import { SHIP_EXIT } from "./spaceship.js";

export function buildCafe(scene, interactions, origin = 190) {
  const portalZ = -12.55;
  const area = createArea(
    "cafe",
    "Sunny Side Café",
    {
      minX: origin - 7,
      maxX: origin + 7,
      minZ: -13,
      maxZ: 9,
    },
    true,
  );
  area.spawn = [origin, 3.5];
  area.portalReturnSpawn = [origin, portalZ + 2];
  area.cameraView = { targetHeight: 2, distance: 5 };
  area.environment = {
    background: 0x0a0618,
    fog: 0x0a0618,
    exposure: 1.1,
    environmentIntensity: 0.25,
    skyIntensity: 0.1,
    sunIntensity: 0,
  };
  scene.add(area.group);
  area.group.visible = false;

  const g = area.group;
  const floor = box(g, origin, -0.12, -2, 14, 0.2, 22, 0x1a1430);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x241b45,
    roughness: 0.85,
    metalness: 0.1,
  });
  for (const [x, y, z, w, h, d] of [
    [origin, 2.5, -13, 14, 5, 0.3],
    [origin - 7, 2.5, -2, 0.3, 5, 22],
    [origin + 7, 2.5, -2, 0.3, 5, 22],
    [origin, 2.5, 9, 14, 5, 0.3],
  ]) {
    const mesh = box(g, x, y, z, w, h, d, 0x241b45);
    mesh.material = wallMat;
    collider(area, mesh, x, z, w, d, 5);
  }

  const pathMat = new THREE.MeshBasicMaterial({ color: 0x4df3ff });
  for (let i = 0; i < 12; i++) {
    const z = 7 - i * 1.65;
    const stone = box(g, origin, 0.02, z, 1.6, 0.04, 1.1, 0x4df3ff);
    stone.material = pathMat;
  }
  const pool = new THREE.Mesh(
    new THREE.CircleGeometry(2.2, 32),
    new THREE.MeshBasicMaterial({
      color: 0x2aff7a,
      transparent: true,
      opacity: 0.25,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(origin, 0.03, portalZ + 0.8);
  g.add(pool);

  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x7a5fff,
    emissive: 0x5a3fff,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.3,
  });
  const crystalMat2 = new THREE.MeshStandardMaterial({
    color: 0x4df3ff,
    emissive: 0x2adfff,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.3,
  });
  const crystalSpots = [
    [origin - 5.8, -10, 1.2, crystalMat],
    [origin - 6.1, -6, 0.8, crystalMat2],
    [origin - 5.9, -1, 1.0, crystalMat],
    [origin + 5.8, -10, 1.0, crystalMat2],
    [origin + 6.1, -6, 1.2, crystalMat],
    [origin + 5.9, -1, 0.8, crystalMat2],
    [origin - 4.5, -12, 0.9, crystalMat],
    [origin + 4.5, -12, 0.9, crystalMat2],
  ];
  for (const [x, z, s, mat] of crystalSpots) {
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(s * 0.5), mat);
    crystal.position.set(x, s * 0.45, z);
    crystal.rotation.y = Math.random() * Math.PI;
    crystal.rotation.z = (Math.random() - 0.5) * 0.3;
    g.add(crystal);
    for (let j = 0; j < 2; j++) {
      const small = new THREE.Mesh(new THREE.OctahedronGeometry(s * 0.22), mat);
      small.position.set(x + (Math.random() - 0.5) * 1.2, s * 0.2, z + (Math.random() - 0.5) * 1.2);
      small.rotation.y = Math.random() * Math.PI;
      g.add(small);
    }
  }

  const sporeCount = 120;
  const sporeGeo = new THREE.BufferGeometry();
  const sporePos = new Float32Array(sporeCount * 3);
  for (let i = 0; i < sporeCount; i++) {
    sporePos[i * 3] = origin + (Math.random() - 0.5) * 12;
    sporePos[i * 3 + 1] = Math.random() * 4.5;
    sporePos[i * 3 + 2] = -12 + Math.random() * 20;
  }
  sporeGeo.setAttribute("position", new THREE.BufferAttribute(sporePos, 3));
  const sporeMat = new THREE.PointsMaterial({
    color: 0x8affff,
    size: 0.08,
    transparent: true,
    opacity: 0.7,
  });
  const spores = new THREE.Points(sporeGeo, sporeMat);
  spores.name = "cafe-spores";
  g.add(spores);
  area.updateSpores = (dt) => {
    const pos = sporeGeo.attributes.position;
    for (let i = 0; i < sporeCount; i++) {
      pos.array[i * 3 + 1] += dt * 0.25;
      if (pos.array[i * 3 + 1] > 4.5) pos.array[i * 3 + 1] = 0;
    }
    pos.needsUpdate = true;
  };

  const veinMat = new THREE.MeshBasicMaterial({ color: 0x3aff8a });
  for (let i = 0; i < 8; i++) {
    const vein = box(g, origin - 6 + i * 1.7, 1.5 + (i % 3) * 0.8, -12.8, 0.08, 2.2 + (i % 2), 0.06, 0x3aff8a);
    vein.material = veinMat;
    vein.rotation.z = (i % 2 ? 1 : -1) * 0.25;
  }

  label(g, "EXIT", origin, 2.5, 8.8, 1.2, "#8affff", "#0a0618");
  const exterior = BUILDINGS.find((building) => building.id === "cafe");
  interactions.register({
    id: "cafe-exit",
    area: "cafe",
    kind: "door",
    target: "town",
    spawn: [exterior.x, exterior.z + exterior.d / 2 + 2.3],
    x: origin,
    z: 7.8,
    radius: 1.4,
    label: "Return to town",
    hint: "Leave Sunny Side Café",
  });
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float time;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float a = atan(p.y, p.x);
        float swirl = 0.5 + 0.5 * sin(a * 4.0 + r * 17.0 - time * 1.4);
        vec3 color = mix(vec3(0.015, 0.22, 1.0), vec3(0.02, 1.0, 0.25), swirl);
        float rim = exp(-pow((r - 0.87) * 25.0, 2.0));
        float glow = 0.3 + 0.5 * swirl + 0.5 * rim;
        float alpha = 1.0 - smoothstep(0.90, 1.0, r);
        gl_FragColor = vec4(color * glow, alpha);
      }`,
  });
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 5.4), material);
  portal.name = "cafe-space-portal";
  portal.position.set(origin, 2.7, portalZ);
  g.add(portal);
  const frameMat = new THREE.MeshBasicMaterial({ color: 0x4df3ff });
  const frameTop = box(g, origin, 5.55, portalZ, 5.4, 0.25, 0.25, 0x4df3ff);
  frameTop.material = frameMat;
  for (const x of [origin - 2.55, origin + 2.55]) {
    const side = box(g, x, 2.7, portalZ, 0.25, 5.7, 0.25, 0x4df3ff);
    side.material = frameMat;
  }
  label(g, "SPACE PORTAL", origin, 6.3, portalZ + 0.2, 2.2, "#4df3ff", "#0a0618");
  interactions.register({
    id: "cafe-space-portal",
    area: "cafe",
    kind: "cafePortal",
    x: origin,
    z: portalZ + 0.8,
    radius: 2.7,
    label: "Enter the Space portal",
    hint: "Walk into the swirl or press E",
  });
  const baseUpdatePortal = (dt, calm) => {
    material.uniforms.time.value += dt * (calm ? 0.25 : 1);
  };
  area.updatePortal = (dt, calm) => {
    baseUpdatePortal(dt, calm);
    if (area.updateSpores) area.updateSpores(dt);
  };
  area.containsPortal = (position) =>
    Math.abs(position.x - origin) < 1.5 &&
    Math.abs(position.z - (portalZ + 0.8)) < 0.9 &&
    position.y >= 0 &&
    position.y < 4;
  return area;
}

export function buildSpaceCafePortal(cafe, space, interactions) {
  const x = SHIP_EXIT.x;
  const z = SHIP_EXIT.z + 5;
  const portal = cafe.group.getObjectByName("cafe-space-portal").clone();
  portal.material = portal.material.clone();
  portal.name = "space-cafe-portal";
  portal.position.set(x, 2.1, z);
  space.group.add(portal);
  label(space.group, "SUNNY SIDE CAFÉ", x, 4.7, z, 3.4);
  interactions.register({
    id: "space-cafe-portal",
    area: "space",
    kind: "cafePortal",
    x,
    y: space.groundY,
    z,
    radius: 2.7,
    label: "Return to Sunny Side Café",
    hint: "Walk into the swirl or press E",
  });
  space.updatePortal = (dt, calm) => {
    portal.material.uniforms.time.value += dt * (calm ? 0.25 : 1);
  };
  space.containsPortal = (position) =>
    Math.abs(position.x - x) < 1.15 &&
    Math.abs(position.z - z) < 0.65 &&
    position.y >= space.groundY &&
    position.y < space.groundY + 3.5;
}
