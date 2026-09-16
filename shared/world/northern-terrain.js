import * as THREE from "three";
import { blob, cylinder, makeTree, material } from "./models.js";

// Alternating peaks leave broad passes on opposite sides of the route.
export const MOUNTAINS = [
  { x: 48, z: -520, radius: 72, height: 150 },
  { x: -48, z: -850, radius: 74, height: 175 },
  { x: 48, z: -1180, radius: 76, height: 185 },
  { x: -48, z: -1510, radius: 72, height: 160 },
  { x: 48, z: -1790, radius: 70, height: 170 },
];
export const LAKES = [
  { x: -35, z: -340, rx: 29, rz: 48 },
  { x: 36, z: -1010, rx: 32, rz: 46 },
  { x: -30, z: -1660, rx: 30, rz: 44 },
];
export function riverX(z) {
  return -15 + Math.sin(z / 90) * 32;
}
export function terrainBlocks(x, y, z, clearance = 4) {
  return MOUNTAINS.some(
    (m) =>
      y < m.height + clearance &&
      Math.hypot(x - m.x, z - m.z) <
        m.radius * Math.max(0, 1 - (y - clearance) / m.height) + clearance,
  );
}
export function waterAt(x, z) {
  return (
    LAKES.some((l) => ((x - l.x) / l.rx) ** 2 + ((z - l.z) / l.rz) ** 2 < 1) ||
    (z < -190 && z > -1930 && Math.abs(x - riverX(z)) < 4)
  );
}
export function buildNorthernTerrain(area) {
  const g = new THREE.Group();
  g.name = "northern-terrain";
  area.group.add(g);
  for (const m of MOUNTAINS) {
    const meshGeometry = new THREE.ConeGeometry(
      m.radius,
      m.height,
      32,
      10,
    ).toNonIndexed();
    const positions = meshGeometry.attributes.position;
    const colors = [];
    const color = new THREE.Color();
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i),
        y = positions.getY(i),
        z = positions.getZ(i);
      const angle = Math.atan2(z, x);
      // Radial folds stay inside the conservative collision envelope.
      const fold = 0.91 + 0.09 * Math.cos(angle * 7);
      positions.setXYZ(i, x * fold, y, z * fold);
      const height = (y + m.height / 2) / m.height;
      color.set(height > 0.73 ? 0xe3edf1 : height > 0.4 ? 0x71848a : 0x607d65);
      color.multiplyScalar(0.9 + 0.1 * Math.cos(angle * 5));
      colors.push(color.r, color.g, color.b);
    }
    meshGeometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3),
    );
    meshGeometry.computeVertexNormals();
    const mountain = new THREE.Mesh(
      meshGeometry,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        flatShading: true,
        roughness: 1,
      }),
    );
    mountain.position.set(m.x, m.height / 2 - 0.05, m.z);
    mountain.name = "solid-mountain";
    mountain.castShadow = mountain.receiveShadow = true;
    g.add(mountain);
    area.cameraMeshes.push(mountain);
    // Approximate circular foothills with narrow strips for walking collision.
    for (let dz = -m.radius; dz < m.radius; dz += 4) {
      const half = Math.sqrt(Math.max(0, m.radius ** 2 - (dz + 2) ** 2));
      area.colliders.push({
        minX: m.x - half,
        maxX: m.x + half,
        minZ: m.z + dz,
        maxZ: m.z + dz + 4,
        maxY: m.height,
      });
    }
  }
  const waterMaterial = new THREE.MeshStandardMaterial({
    color: 0x328ba6,
    roughness: 0.24,
    metalness: 0.15,
  });
  for (const l of LAKES) {
    const shore = new THREE.Mesh(
      new THREE.CircleGeometry(1, 48),
      material(l.z < -1300 ? 0xd7e5df : 0xc7b886),
    );
    shore.rotation.x = -Math.PI / 2;
    shore.scale.set(l.rx + 2.6, l.rz + 2.6, 1);
    shore.position.set(l.x, -0.005, l.z);
    g.add(shore);
    const lake = new THREE.Mesh(new THREE.CircleGeometry(1, 48), waterMaterial);
    lake.rotation.x = -Math.PI / 2;
    lake.scale.set(l.rx, l.rz, 1);
    lake.position.set(l.x, 0.015, l.z);
    lake.name = "northern-lake";
    g.add(lake);
    for (let j = 0; j < 22; j++) {
      const angle = (j * Math.PI * 2) / 22;
      const x = l.x + Math.cos(angle) * (l.rx + 3),
        z = l.z + Math.sin(angle) * (l.rz + 3);
      if (terrainBlocks(x, 0, z)) continue;
      const rock = blob(g, x, 0.3, z, 0.65 + (j % 3) * 0.2, 0x82948c, 0);
      rock.scale.set(1.3, 0.7, 1);
      if (l.z > -1300)
        for (let k = 0; k < 3; k++)
          cylinder(
            g,
            x + k * 0.24,
            0.6,
            z,
            0.035,
            0.06,
            1.2 + (k % 2) * 0.4,
            0x698950,
            5,
          );
    }
  }
  // A continuous ribbon gives the river curved banks without overlapping tiles.
  const vertices = [],
    indices = [];
  for (let i = 0; i <= 348; i++) {
    const z = -190 - i * 5,
      x = riverX(z);
    vertices.push(x - 4, 0.02, z, x + 4, 0.02, z);
    if (i < 348) {
      const k = i * 2;
      indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const river = new THREE.Mesh(geometry, waterMaterial);
  river.name = "northern-river";
  g.add(river);
  const banks = geometry.clone();
  const bankPositions = banks.attributes.position;
  for (let i = 0; i < bankPositions.count; i++) {
    bankPositions.setX(i, bankPositions.getX(i) + (i % 2 ? 1.7 : -1.7));
    bankPositions.setY(i, -0.005);
  }
  g.add(new THREE.Mesh(banks, material(0xbab89a)));
  // Winter ground and bushy trees are confined to the northern journey.
  const winter = cylinder(g, 0, -0.025, -1590, 90, 90, 0.035, 0xd7e7e7, 48);
  winter.scale.z = 3.2;
  for (let z = -220; z > -1940; z -= 34)
    for (const x0 of [-76, -52, 58, 78]) {
      const x = x0 + Math.sin(z * 0.3 + x0) * 5;
      if (terrainBlocks(x, 0, z, 6) || waterAt(x, z)) continue;
      const snowy = z < -1320;
      const autumn = z < -700 && z > -1320;
      const tree = makeTree(
        g,
        x,
        z,
        1.35,
        snowy ? 0x6f9791 : autumn ? 0xba813f : 0x3d8755,
      );
      tree.name = "northern-bushy-tree";
      blob(
        tree,
        0,
        3.6,
        0,
        1.3,
        snowy ? 0xe1eeee : autumn ? 0xd5a248 : 0x5d9d59,
        1,
      );
      blob(g, x + 2, 0.7, z + 2, 1.35, snowy ? 0xc9dedd : 0x4b8c50, 1);
      area.colliders.push({
        minX: x - 0.4,
        maxX: x + 0.4,
        minZ: z - 0.4,
        maxZ: z + 0.4,
        maxY: 5,
      });
    }
  // Small vegetation islands, boulders and alpine shrubs give low flights
  // detail while keeping the runway approach free.
  for (let i = 0; i < 180; i++) {
    const z = -200 - i * 9.4,
      x = Math.sin(i * 2.399) * 82;
    if (terrainBlocks(x, 0, z, 8) || waterAt(x, z)) continue;
    const snow = z < -1320;
    if (i % 3 === 0) {
      const rock = blob(g, x, 0.55, z, 1.2, snow ? 0xcad9dc : 0x8b9689, 0);
      rock.scale.set(1.6, 0.7, 1);
    } else {
      blob(g, x, 0.45, z, 0.9, snow ? 0xc3d9d5 : 0x5b904c, 1);
      for (let j = 0; j < 3; j++)
        blob(
          g,
          x + j * 0.35,
          0.8,
          z + 0.2,
          0.14,
          snow ? 0xe8f4f2 : 0xe7bd65,
          0,
        );
    }
  }
  return g;
}
