import * as THREE from "three";
import { clone as cloneSkeleton } from "three/addons/utils/SkeletonUtils.js";
import { CharacterAnimator } from "../../shared/core/character-animation.js";

export function createScene(color) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(color);
  scene.add(new THREE.HemisphereLight(0xf4fbff, 0x788a9a, 2.1));
  const sun = new THREE.DirectionalLight(0xffeedc, 2.5);
  sun.position.set(-8, 14, 10);
  scene.add(sun);
  return scene;
}
export class Art {
  constructor() {
    this.materials = new Map();
  }
  dispose() {
    this.materials.forEach((m) => m.dispose());
    this.materials.clear();
  }
  mat(color, options = {}) {
    const key = color + JSON.stringify(options);
    if (!this.materials.has(key))
      this.materials.set(
        key,
        new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...options }),
      );
    return this.materials.get(key);
  }
  mesh(parent, geometry, color, x = 0, y = 0, z = 0, options = {}) {
    const m = new THREE.Mesh(geometry, this.mat(color, options));
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  box(p, x, y, z, w, h, d, c) {
    return this.mesh(p, new THREE.BoxGeometry(w, h, d), c, x, y, z);
  }
  ball(p, x, y, z, r, c, detail = 1) {
    return this.mesh(p, new THREE.IcosahedronGeometry(r, detail), c, x, y, z);
  }
  cylinder(p, x, y, z, r1, r2, h, c) {
    return this.mesh(p, new THREE.CylinderGeometry(r1, r2, h, 16), c, x, y, z);
  }
}
export function cloneAvatar(source) {
  // Deep-copy GPU resources so mini-game disposal never touches the town model.
  const clone = cloneSkeleton(source);
  const carried = [];
  clone.traverse((node) => {
    if (node.userData.carriedItem) carried.push(node);
  });
  carried.forEach((node) => node.removeFromParent());
  clone.userData = { avatarId: source.userData.avatarId };
  clone.position.set(0, 0, 0);
  clone.rotation.set(0, 0, 0);
  clone.scale.set(1, 1, 1);
  clone.visible = true;
  clone.traverse((node) => {
    if (node.isMesh) {
      node.geometry = node.geometry.clone();
      const copy = (m) => {
        const result = m.clone();
        for (const [key, value] of Object.entries(result))
          if (value?.isTexture) {
            result[key] = value.clone();
            result[key].needsUpdate = true;
          }
        return result;
      };
      node.material = Array.isArray(node.material)
        ? node.material.map(copy)
        : copy(node.material);
    }
  });
  clone.animations = source.animations;
  if (clone.animations?.length) clone.animator = new CharacterAnimator(clone);
  return clone;
}

export function showAvatarPortrait(avatar) {
  // Imported models have nested groups rather than the old primitive children.
  avatar.traverse((node) => {
    if (node.isMesh)
      node.visible = ["head", "hat", "face"].includes(node.userData.avatarPart);
  });
}
export function disposeScene(scene, extraTextures = []) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set(extraTextures);
  scene.traverse((o) => {
    o.animator?.dispose();
    if (o.geometry) geometries.add(o.geometry);
    for (const m of Array.isArray(o.material) ? o.material : [o.material])
      if (m) {
        materials.add(m);
        for (const value of Object.values(m))
          if (value?.isTexture) textures.add(value);
      }
  });
  geometries.forEach((g) => g.dispose());
  textures.forEach((t) => t.dispose());
  materials.forEach((m) => m.dispose());
  scene.clear();
}
export class Sparkles {
  constructor(scene, capacity = 240) {
    this.capacity = capacity;
    this.cursor = 0;
    this.lives = new Float32Array(capacity);
    this.velocities = new Float32Array(capacity * 3);
    this.positions = new Float32Array(capacity * 3).fill(-1000);
    this.colors = new Float32Array(capacity * 3);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3),
    );
    this.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(this.colors, 3),
    );
    this.points = new THREE.Points(
      this.geometry,
      new THREE.PointsMaterial({
        size: 0.14,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    this.points.frustumCulled = false;
    scene.add(this.points);
  }
  burst(position, color = 0xffd979, count = 20) {
    const rgb = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const n = this.cursor++ % this.capacity,
        j = n * 3;
      this.lives[n] = 0.6 + Math.random() * 0.7;
      this.positions.set([position.x, position.y, position.z], j);
      this.velocities.set(
        [
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.3) * 5,
          (Math.random() - 0.5) * 4,
        ],
        j,
      );
      this.colors.set([rgb.r, rgb.g, rgb.b], j);
    }
    this.geometry.attributes.color.needsUpdate = true;
  }
  update(dt, gravity = 1) {
    for (let n = 0; n < this.capacity; n++) {
      const j = n * 3;
      if (this.lives[n] > 0) {
        this.lives[n] -= dt;
        this.velocities[j + 1] -= gravity * dt;
        for (let k = 0; k < 3; k++)
          this.positions[j + k] += this.velocities[j + k] * dt;
      } else this.positions[j + 1] = -1000;
    }
    this.geometry.attributes.position.needsUpdate = true;
  }
}
export const steer = (input) => {
  const x =
    Number(input.down("ArrowRight", "KeyD")) -
    Number(input.down("ArrowLeft", "KeyA"));
  const y =
    Number(input.down("ArrowUp", "KeyW")) -
    Number(input.down("ArrowDown", "KeyS"));
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
};
