import * as THREE from "three";
import {
  box,
  cylinder,
  blob,
  label,
  makeTree,
  makeBench,
  makeBuilding,
  collider,
} from "./models.js";
import { buildLandscape, TOWN_BOUNDS } from "./landscape.js";

export const BUILDINGS = [
  {
    id: "arcade",
    name: "STAR ARCADE",
    x: -12,
    z: -12,
    w: 9,
    d: 8,
    h: 5,
    color: 0xe7aaa4,
    roof: 0x9b696e,
    awning: 0xbf6e78,
  },
  {
    id: "library",
    name: "LITTLE LIBRARY",
    x: 0,
    z: -13,
    w: 8,
    d: 8,
    h: 5.8,
    color: 0xf3d796,
    roof: 0x5d8683,
  },
  {
    id: "rec",
    name: "RECREATION CLUB",
    x: 12,
    z: -12,
    w: 9,
    d: 8,
    h: 5,
    color: 0xa1cbd1,
    roof: 0x567f91,
  },
  {
    id: "cafe",
    name: "SUNNY SIDE CAFÉ",
    x: -12,
    z: 10,
    w: 9,
    d: 8,
    h: 4.5,
    color: 0xf0cf94,
    roof: 0xb3795a,
    awning: 0xe1b44f,
  },
];
export const TRAMPOLINE = { x: 11, z: 6, radius: 1.9, height: 0.48 };
export const LEAVES = { x: 4, z: 10, radius: 2 };
export function createArea(id, name, bounds, interior = false) {
  return {
    id,
    name,
    bounds,
    interior,
    group: new THREE.Group(),
    colliders: [],
    cameraMeshes: [],
    trampoline: null,
  };
}
export function buildTown(scene, interactions) {
  const area = createArea("town", "Town Square", { ...TOWN_BOUNDS });
  const g = area.group;
  scene.add(g);
  area.trampoline = TRAMPOLINE;
  buildLandscape(g, area);
  // Perimeter streets leave the middle of town safe and spacious to explore.
  for (const z of [-24, 24]) box(g, 0, -0.018, z, 54, 0.08, 6, 0x7c9393);
  for (const x of [-24, 24]) box(g, x, -0.017, 0, 6, 0.08, 54, 0x7c9393);
  for (const z of [-19.5, 19.5]) box(g, 0, 0.01, z, 42, 0.12, 3, 0xe7dcbc);
  for (const x of [-19.5, 19.5]) box(g, x, 0.011, 0, 3, 0.12, 42, 0xe7dcbc);
  for (let v = -20; v <= 20; v += 4)
    for (const sign of [-1, 1]) {
      box(g, v, 0.035, sign * 24, 1.8, 0.015, 0.13, 0xe1ded0);
      box(g, sign * 24, 0.035, v, 0.13, 0.015, 1.8, 0xe1ded0);
    }
  for (const z of [-24, 24])
    for (let i = -3; i <= 3; i++)
      box(g, i * 0.55, 0.04, z, 0.32, 0.02, 5.6, 0xf5ebd3);
  // Central promenade and small connecting walks.
  box(g, 0, 0.012, 0, 4, 0.08, 38, 0xefe4c8);
  box(g, 0, 0.013, -3, 38, 0.08, 3.5, 0xefe4c8);
  for (const b of BUILDINGS) {
    makeBuilding(area, b);
    box(g, b.x, 0.015, b.z + b.d / 2 + 2, b.w * 0.42, 0.07, 4, 0xe8ddbf);
  }
  for (const b of BUILDINGS.filter((b) =>
    ["arcade", "library", "rec"].includes(b.id),
  )) {
    interactions.register({
      id: b.id + "-door",
      area: "town",
      kind: "door",
      target: b.id,
      x: b.x,
      z: b.z + b.d / 2 + 0.95,
      label:
        "Enter " +
        (b.id === "arcade"
          ? "Star Arcade"
          : b.id === "library"
            ? "Little Library"
            : "Recreation Club"),
      hint: "Come on in",
    });
    cylinder(g, b.x, 0.07, b.z + b.d / 2 + 1, 0.9, 0.9, 0.05, 0xf8d77f, 24);
  }
  // Park, play pads, walking path, benches and a fountain.
  box(g, 10, 0.02, 9, 15, 0.08, 18, 0x9ac677);
  box(g, 10, 0.071, 15, 15, 0.025, 1.6, 0xe6d6ae);
  label(g, "MEADOW PARK", 10, 2.8, 17.2, 5.3, "#456f60", "#fff1d1");
  for (const x of [7.6, 12.4]) box(g, x, 1.4, 17.2, 0.13, 2.8, 0.15, 0x9c805a);
  cylinder(g, 11, 0.08, 6, 2.55, 2.55, 0.12, 0xe8cd9c, 32);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    box(
      g,
      11 + Math.sin(a) * 2,
      0.22,
      6 + Math.cos(a) * 2,
      0.11,
      0.44,
      0.11,
      0x466b71,
    );
  }
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(2, 0.17, 8, 32),
    new THREE.MeshStandardMaterial({ color: 0xdaa357, roughness: 0.65 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(11, 0.49, 6);
  ring.castShadow = true;
  g.add(ring);
  area.trampolineMesh = cylinder(g, 11, 0.44, 6, 1.9, 1.9, 0.07, 0x3f7077, 32);
  for (const x of [-0.55, 0.55])
    box(g, 11 + x, 0.485, 6, 0.08, 0.02, 1.1, 0x7db3a8);
  label(g, "BOUNCE", 11, 1.2, 3.3, 2.4);
  box(g, 11, 0.5, 3.3, 0.08, 1, 0.08, 0x9d805c);
  interactions.register({
    id: "trampoline",
    kind: "hint",
    area: "town",
    x: 11,
    z: 6,
    radius: 3,
    label: "Trampoline",
    hint: "Jump onto the mat to bounce",
    key: "Space",
  });
  interactions.register({
    id: "leaves",
    kind: "hint",
    area: "town",
    x: 4,
    z: 10,
    radius: 3,
    label: "A pile of crunchy leaves",
    hint: "Jump in and watch them fly",
    key: "Space",
  });
  box(g, 15.5, 0.75, 11, 1.5, 1.5, 0.5, 0x48766a);
  label(g, "PLAY", 15.5, 1, 11.27, 1.3, "#48766a", "#fff0ce");
  label(g, "ACTIVITY AREA", 15.5, 1.7, 11.3, 2.8);
  interactions.register({
    id: "park-games",
    destination: "park",
    area: "town",
    kind: "destination",
    x: 15.5,
    z: 12.4,
    label: "Park activities",
    hint: "A future place to play",
  });
  const fountain = cylinder(g, -8, 0.35, 2.5, 1.8, 1.9, 0.7, 0xe3c9a3, 16);
  collider(area, fountain, -8, 2.5, 3.6, 3.6, 2.5);
  cylinder(g, -8, 0.72, 2.5, 1.55, 1.55, 0.035, 0x80bec2, 24);
  cylinder(g, -8, 1, 2.5, 0.23, 0.42, 1.5, 0xebd4b1);
  cylinder(g, -8, 1.7, 2.5, 0.9, 0.65, 0.18, 0xeddbbb, 16);
  blob(g, -8, 2.1, 2.5, 0.25, 0x9bd6d4, 1);
  for (const [x, z, r] of [
    [6, 16, 0],
    [15, 1, Math.PI],
    [-4, 4, -Math.PI / 2],
    [-15, -0.5, 0],
  ]) {
    makeBench(g, x, z, r);
    const wx = Math.abs(Math.cos(r)) * 1.15 + Math.abs(Math.sin(r)) * 0.45,
      wz = Math.abs(Math.sin(r)) * 1.15 + Math.abs(Math.cos(r)) * 0.45;
    area.colliders.push({
      minX: x - wx,
      maxX: x + wx,
      minZ: z - wz,
      maxZ: z + wz,
      maxY: 1.5,
    });
  }
  const trees = [
    [-28, -28, 1.3],
    [-18, -17, 0.95],
    [18, -17, 0.9],
    [-28, -8, 1.1],
    [-28, 7, 1.3],
    [-28, 27, 1.1],
    [28, -27, 1.3],
    [28, -8, 1.1],
    [28, 9, 1.3],
    [27, 27, 1.2],
    [-18, 17, 0.9],
    [5, 3, 0.9],
    [17, 15, 1.05],
    [16, 6, 0.75],
    [3, 17, 0.8],
    [-7, 17, 0.8],
  ];
  trees.forEach(([x, z, s], i) => {
    makeTree(g, x, z, s, [0x70a86e, 0x80b57a, 0xb1bb70][i % 3]);
    area.colliders.push({
      minX: x - 0.25,
      maxX: x + 0.25,
      minZ: z - 0.25,
      maxZ: z + 0.25,
      maxY: 2.5,
    });
  });
  // The old boundary is now a low garden belt around town. Wide openings on
  // every side lead into the new countryside.
  for (let i = -27; i <= 27; i += 3)
    for (const s of [-1, 1]) {
      if (Math.abs(i) < 7) continue;
      blob(g, i, 0.4, s * 29.4, 0.72, 0x669966);
      blob(g, s * 29.4, 0.4, i, 0.72, 0x669966);
    }
  for (const [x, z] of [
    [-17, 2],
    [-4, -7],
    [17, -7],
    [7, 17],
  ]) {
    box(g, x, 0.18, z, 1.7, 0.35, 0.8, 0xc79668);
    for (let i = 0; i < 5; i++) {
      cylinder(g, x - 0.6 + i * 0.3, 0.5, z, 0.03, 0.03, 0.5, 0x6d9761, 5);
      blob(
        g,
        x - 0.6 + i * 0.3,
        0.8,
        z,
        0.18,
        [0xecc96a, 0xe8a194, 0xffebbe][i % 3],
      );
    }
  }
  for (const [x, z] of [
    [-20, -18],
    [20, -18],
    [-20, 18],
    [20, 18],
    [-3, -6],
    [3, 18],
  ]) {
    cylinder(g, x, 1.65, z, 0.07, 0.1, 3.3, 0x426969, 8);
    box(g, x, 3.35, z, 0.55, 0.7, 0.55, 0xffe6a9);
    box(g, x, 3.76, z, 0.72, 0.13, 0.72, 0x416a65);
  }
  return area;
}
