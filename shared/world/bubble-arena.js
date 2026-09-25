import * as THREE from "three";
import { box, blob, label } from "./models.js";

export const BUBBLE_ARENA_BOUNDS = Object.freeze({
  minX: 140,
  maxX: 360,
  minZ: -410,
  maxZ: -190,
});
export const BUBBLE_ARENA_START = Object.freeze({ x: 250, z: -202 });
export const BUBBLE_ARENA_EXIT = Object.freeze({ x: 250, z: -174 });
export const CROWD_SECONDS = 3;
export const CROWD_DISTANCE = 2.4;
export function insideBubbleArena(p, margin = 0) {
  const b = BUBBLE_ARENA_BOUNDS;
  return (
    p.x >= b.minX + margin &&
    p.x <= b.maxX - margin &&
    p.z >= b.minZ + margin &&
    p.z <= b.maxZ - margin
  );
}
export function arenaSafeZone(p) {
  return (
    Math.hypot(p.x - BUBBLE_ARENA_START.x, p.z - BUBBLE_ARENA_START.z) < 10
  );
}

export function buildBubbleArena(area) {
  const group = new THREE.Group();
  group.name = "moon-bubble-arena";
  area.group?.add(group);
  const colliders = [];
  const solid = (x, z, w, d, h, color = 0x83858b) => {
    const mesh = box(group, x, h / 2, z, w, h, d, color);
    mesh.name = "bubble-arena-cover";
    const collider = {
      minX: x - w / 2,
      maxX: x + w / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
      minY: area.groundY,
      maxY: area.groundY + h,
    };
    colliders.push(collider);
    area.colliders.push(collider);
    area.cameraMeshes?.push(mesh);
    return mesh;
  };
  // The existing moon ground and crater texture remain the arena floor.
  solid(140, -300, 2, 220, 3.5);
  solid(360, -300, 2, 220, 3.5);
  solid(250, -410, 220, 2, 3.5);
  solid(190, -190, 100, 2, 3.5);
  solid(310, -190, 100, 2, 3.5);
  for (const [x, z, w, d] of [
    [140, -300, 2.2, 220],
    [360, -300, 2.2, 220],
    [250, -410, 220, 2.2],
    [190, -190, 100, 2.2],
    [310, -190, 100, 2.2],
  ])
    box(group, x, 3.55, z, w, 0.18, d, 0x91ddcf);
  // Separate cover islands leave wide lanes and a clear entrance approach.
  for (const [x, z, w, d, h] of [
    [215, -240, 18, 6, 3.2],
    [285, -240, 6, 18, 3.5],
    [175, -275, 10, 12, 4],
    [250, -280, 20, 6, 3.2],
    [325, -275, 12, 10, 4],
    [205, -315, 6, 22, 3.5],
    [290, -315, 22, 6, 3.2],
    [175, -355, 16, 6, 3.4],
    [250, -350, 10, 16, 4],
    [330, -355, 6, 18, 3.5],
    [210, -385, 12, 6, 3],
    [290, -385, 12, 6, 3],
  ]) {
    solid(x, z, w, d, h);
    box(group, x, h + 0.08, z, w + 0.15, 0.16, d + 0.15, 0xa8a7a2);
    box(
      group,
      x,
      h * 0.6,
      z + d / 2 + 0.05,
      Math.min(w * 0.6, 4),
      0.25,
      0.12,
      0xc0e7dd,
    );
    const rock = blob(group, x, h + 0.6, z, 1.1, 0x9b9995, 1);
    rock.scale.set(1.4, 0.65, 1);
  }
  for (const x of [239, 261]) {
    box(group, x, 4, -190, 1.3, 8, 1.3, 0x9bddcb);
    const orb = blob(group, x, 8.4, -190, 1.25, 0xbce9e7, 2);
    orb.name = "bubble-arena-entrance-orb";
  }
  box(group, 250, 8, -190, 23, 1.8, 1.3, 0x213d50);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(9.4, 10, 64),
    new THREE.MeshBasicMaterial({ color: 0xa4e2d1, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(250, 0.06, -202);
  group.add(ring);
  if (globalThis.document?.createElement) {
    label(group, "BUBBLE BASIN", 250, 8, -189.25, 20, "#213d50", "#dcf8eb");
    label(
      group,
      "START · SAFE CIRCLE",
      267,
      2.1,
      -201,
      8,
      "#213d50",
      "#dcf8eb",
    );
    label(group, "BUBBLE BASIN ↗", 62, 3, -46, 12, "#213d50", "#dcf8eb");
    label(
      group,
      "ENTER TO PLAY · WALK OUT TO REST",
      273,
      2.8,
      -187,
      14,
      "#213d50",
      "#dcf8eb",
    );
  }
  return {
    group,
    bounds: { minX: 142, maxX: 358, minZ: -408, maxZ: -192 },
    colliders: area.colliders,
    groundY: area.groundY,
    alienSafeZone: arenaSafeZone,
  };
}
