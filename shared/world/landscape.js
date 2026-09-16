import { blob, box, cylinder, makeTree } from "./models.js";
import { NORTH_EXTENSION, WORLD_BOUNDS } from "./world-layout.js";
import { buildNorthernTerrain } from "./northern-terrain.js";

// The original town occupied a 60 x 60 square. The new playable countryside is
// three times as wide and deep, while a non-playable scenery skirt keeps the
// camera from ever revealing the edge of the ground.
export const ORIGINAL_WORLD_SIZE = 60;
export const WORLD_SIZE = ORIGINAL_WORLD_SIZE * 3;
export const WORLD_HALF_SIZE = WORLD_SIZE / 2;
export const SCENERY_SIZE = 650;
export const TOWN_BOUNDS = WORLD_BOUNDS;

const ALL_EXPANSION_TREES = [
  [-54, 43, 1.2],
  [-65, 32, 0.96],
  [-51, 62, 1.12],
  [-80, 56, 1.05],
  [-68, 50, 1.25],
  [-46, 52, 0.9],
  [-79, 34, 1.18],
  [-62, 16, 0.96],
  [-47, 39, 1.08],
  [-79, -74, 1.25],
  [-68, -79, 0.95],
  [-55, -76, 1.15],
  [-78, -59, 1.05],
  [-65, -54, 1.2],
  [-49, -63, 0.9],
  [-77, -38, 1.25],
  [-62, -40, 0.92],
  [-44, -45, 1.12],
  [-80, -17, 1.08],
  [-66, -22, 1.28],
  [-48, -31, 0.88],
  [80, -12, 1.22],
  [67, -15, 0.9],
  [48, -23, 1.16],
  [78, 20, 1.12],
  [66, 29, 0.95],
  [77, 47, 1.26],
  [63, 53, 1.05],
  [79, 69, 1.18],
  [61, 76, 0.92],
  [43, 73, 1.1],
  [77, 82, 1.02],
  [-79, 18, 1.2],
  [-77, 78, 1.14],
  [-57, 79, 0.94],
  [-38, 76, 1.2],
];

// Keep the player's chosen southwest clearing open for Friendly Farm.
const AIRFIELD_EDGE_TREES = [
  [31, 36, 1.08],
  [31, 55, 0.94],
  [31, 74, 1.16],
  [72, 8, 0.96],
  [84, 8, 1.14],
];

export const EXPANSION_TREES = [
  ...ALL_EXPANSION_TREES.filter(
    ([x, z]) =>
      !(x >= -90 && x <= 3 && z >= 27 && z <= 90) &&
      // Keep the southeast airfield and its takeoff corridor unobstructed.
      !(x >= 34 && x <= 88 && z >= 12 && z <= 90),
  ),
  ...AIRFIELD_EDGE_TREES,
];

const GRASS_PATCHES = [
  [-62, -67, 12, 0x8fb776],
  [-57, -20, 9, 0x99bf7b],
  [-69, 54, 13, 0x8db471],
  [-38, 67, 8, 0x9abe7e],
  [61, -65, 11, 0x8fb777],
  [66, -22, 8, 0x99bf7a],
  [57, 43, 12, 0x8eb572],
  [37, 69, 9, 0x99bd7b],
];

const FLOWER_PATCHES = [
  [-52, -34],
  [-37, -66],
  [-69, 8],
  [-39, 45],
  [43, -61],
  [67, 2],
  [45, 38],
  [64, 68],
];

export function buildLandscape(parent, area) {
  const grass = box(
    parent,
    0,
    -0.45,
    -NORTH_EXTENSION / 2,
    SCENERY_SIZE,
    0.8,
    SCENERY_SIZE + NORTH_EXTENSION,
    0x92b973,
  );
  grass.name = "expanded-grassland";
  const soil = box(
    parent,
    0,
    -1.3,
    -NORTH_EXTENSION / 2,
    SCENERY_SIZE,
    1,
    SCENERY_SIZE + NORTH_EXTENSION,
    0xc3a580,
  );
  soil.name = "expanded-soil";
  buildNorthernTerrain(area);

  // Sparse groves leave the northbound approach and destination clear.
  for (let z = -180; z > TOWN_BOUNDS.minZ + 35; z -= 85) {
    for (const x of [-74, -53]) {
      const tree = makeTree(parent, x, z, 1.1, 0x70a86e);
      tree.name = "north-meadow-tree";
      area.colliders.push({
        minX: x - 0.3,
        maxX: x + 0.3,
        minZ: z - 0.3,
        maxZ: z + 0.3,
        maxY: 3.6,
      });
    }
  }

  // Broad, subtle color patches break up the acreage without occupying the
  // open space reserved for future activities.
  for (const [x, z, radius, color] of GRASS_PATCHES) {
    const patch = cylinder(
      parent,
      x,
      -0.035,
      z,
      radius,
      radius,
      0.035,
      color,
      24,
    );
    patch.name = "meadow-grass-patch";
  }

  EXPANSION_TREES.forEach(([x, z, size], index) => {
    const tree = makeTree(
      parent,
      x,
      z,
      size,
      [0x70a86e, 0x80b57a, 0x9eb879][index % 3],
    );
    tree.name = "countryside-tree";
    area.colliders.push({
      minX: x - 0.28 * size,
      maxX: x + 0.28 * size,
      minZ: z - 0.28 * size,
      maxZ: z + 0.28 * size,
      maxY: 3.2 * size,
    });
  });

  for (const [patchX, patchZ] of FLOWER_PATCHES) {
    for (let index = 0; index < 7; index++) {
      const angle = index * 2.4;
      const radius = 0.35 + (index % 3) * 0.42;
      const x = patchX + Math.cos(angle) * radius;
      const z = patchZ + Math.sin(angle) * radius;
      cylinder(parent, x, 0.16, z, 0.018, 0.025, 0.32, 0x668d59, 5);
      blob(parent, x, 0.38, z, 0.1, [0xf1c66d, 0xe8a7a1, 0xf8e7b5][index % 3]);
    }
  }

  // These hills sit beyond the playable acreage. Together with the scenery
  // skirt and fog, they replace the old visible drop into empty space.
  for (let index = 0; index < 20; index++) {
    const angle = (index / 20) * Math.PI * 2;
    const distance = 122 + (index % 2) * 12;
    // Move northern backdrop hills beyond the new end of the map.
    const northOffset = Math.cos(angle) < 0 ? -NORTH_EXTENSION : 0;
    const hill = blob(
      parent,
      Math.sin(angle) * distance,
      -5,
      Math.cos(angle) * distance + northOffset,
      15 + (index % 4) * 3,
      index % 3 === 0 ? 0x8fb88b : 0x9dc69a,
      1,
    );
    hill.name = "distant-hill";
    hill.scale.y = 0.62;
  }

  area.expansion = {
    originalSize: ORIGINAL_WORLD_SIZE,
    worldSize: WORLD_SIZE,
    scenerySize: SCENERY_SIZE,
    treeCount: EXPANSION_TREES.length,
    flowerPatchCount: FLOWER_PATCHES.length,
  };
}
