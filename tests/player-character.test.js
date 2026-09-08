import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { preparePlayerCharacter } from "../shared/world/player-character.js";
import { Player } from "../shared/core/player.js";
import { FollowCamera } from "../shared/core/camera.js";
import {
  cloneAvatar,
  showAvatarPortrait,
  disposeScene,
} from "../games/shared/scene.js";

async function loadCowboy() {
  const file = await readFile(
    new URL("../assets/models/cowboy.glb", import.meta.url),
  );
  const gltf = await new GLTFLoader().parseAsync(
    file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
    "",
  );
  return preparePlayerCharacter(gltf);
}

test("held side movement keeps steering while the follow camera turns behind it", () => {
  const player = new Player(new THREE.Scene(), new THREE.Group());
  const follow = new FollowCamera(new THREE.PerspectiveCamera());
  const held = new Set(["KeyA"]);
  const input = {
    lookX: 0,
    lookY: 0,
    down: (...keys) => keys.some((key) => held.has(key)),
    consume: () => false,
  };
  const area = {
    colliders: [],
    cameraMeshes: [],
    bounds: { minX: -50, maxX: 50, minZ: -50, maxZ: 50 },
  };
  for (let i = 0; i < 10; i++) {
    player.update(1 / 60, input, follow.yaw, area);
    follow.update(1 / 60, player, input, area);
  }
  assert.ok(
    player.movementViewYaw > 0.2 && player.movementViewYaw < 0.65,
    "left input should ease into the turn instead of snapping sideways",
  );
  for (let i = 10; i < 60; i++) {
    player.update(1 / 60, input, follow.yaw, area);
    follow.update(1 / 60, player, input, area);
  }
  const middleYaw = follow.yaw;
  const middlePosition = player.position.clone();
  for (let i = 60; i < 120; i++) {
    player.update(1 / 60, input, follow.yaw, area);
    follow.update(1 / 60, player, input, area);
  }
  assert.ok(
    middleYaw > 2 && follow.yaw > middleYaw + 2,
    "held left input should keep steering without a second key press",
  );
  assert.ok(
    player.position.distanceTo(middlePosition) > 3,
    "held left input should keep moving during the continued turn",
  );
});

test("forward movement keeps moving while a held side key steers", () => {
  const player = new Player(new THREE.Scene(), new THREE.Group());
  const follow = new FollowCamera(new THREE.PerspectiveCamera());
  const held = new Set(["KeyW", "KeyD"]);
  const input = {
    lookX: 0,
    lookY: 0,
    down: (...keys) => keys.some((key) => held.has(key)),
    consume: () => false,
  };
  const area = {
    colliders: [],
    cameraMeshes: [],
    bounds: { minX: -50, maxX: 50, minZ: -50, maxZ: 50 },
  };
  for (let i = 0; i < 30; i++) {
    player.update(1 / 60, input, follow.yaw, area);
    follow.update(1 / 60, player, input, area);
  }
  assert.ok(player.position.z < 15, "forward input should keep moving ahead");
  for (let i = 30; i < 120; i++) {
    player.update(1 / 60, input, follow.yaw, area);
    follow.update(1 / 60, player, input, area);
  }
  assert.ok(player.position.x > 0, "side input should steer while moving ahead");
  assert.ok(
    player.movementViewYaw < -2,
    "held right input should keep turning forward movement",
  );
});

test("back input walks backward without turning the camera view", () => {
  const player = new Player(new THREE.Scene(), new THREE.Group());
  const follow = new FollowCamera(new THREE.PerspectiveCamera());
  const held = new Set(["KeyS"]);
  const input = {
    lookX: 0,
    lookY: 0,
    down: (...keys) => keys.some((key) => held.has(key)),
    consume: () => false,
  };
  const area = {
    colliders: [],
    cameraMeshes: [],
    bounds: { minX: -50, maxX: 50, minZ: -50, maxZ: 50 },
  };
  for (let i = 0; i < 90; i++) {
    player.update(1 / 60, input, follow.yaw, area);
    follow.update(1 / 60, player, input, area);
  }
  assert.ok(player.position.z > 21, "back input should move backward");
  assert.ok(
    Math.abs(follow.yaw) < 0.01,
    "back input should not rotate the camera view",
  );
  assert.ok(
    Math.abs(Math.abs(player.heading) - Math.PI) < 0.03,
    "player should keep facing forward while backing up",
  );
});

test("shipped cowboy has game scale, grounded feet, forward face and a complete animation rig", async () => {
  const model = await loadCowboy();
  const bounds = new THREE.Box3().setFromObject(model);
  assert.ok(Math.abs(bounds.min.y) < 1e-5);
  assert.ok(Math.abs(bounds.max.y - 1.85) < 1e-4);
  assert.deepEqual(
    new Set(model.animations.map((c) => c.name)),
    new Set([
      "Idle",
      "Walk",
      "Run",
      "JumpStart",
      "JumpRise",
      "JumpFall",
      "Land",
      "Dance",
      "Reach",
      "Carry",
    ]),
  );
  assert.ok(model.getObjectByName("DEF-handR")?.isBone);
  const parts = new Set();
  let triangles = 0;
  model.traverse((node) => {
    assert.ok(
      !node.isCamera && !node.isLight && !/studio|pedestal/i.test(node.name),
    );
    if (!node.isMesh) return;
    parts.add(node.userData.avatarPart);
    assert.ok(node.castShadow && node.receiveShadow);
    triangles +=
      (node.geometry.index?.count ?? node.geometry.attributes.position.count) /
      3;
    if (node.userData.avatarPart === "face")
      assert.ok(
        new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3()).z >
          0,
      );
  });
  assert.deepEqual(
    parts,
    new Set([
      "body",
      "head",
      "shirt",
      "trousers",
      "boots",
      "hat",
      "gear",
      "face",
    ]),
  );
  assert.ok(
    triangles > 1000 && triangles < 160000,
    `unexpected mesh budget: ${triangles}`,
  );
});

test("cowboy walks, turns and jumps with animated bones", async () => {
  const model = await loadCowboy();
  const transforms = new Map();
  model.traverse((n) => {
    if (n !== model) transforms.set(n, n.matrix.clone());
  });
  const player = new Player(new THREE.Scene(), model);
  const area = {
    colliders: [],
    bounds: { minX: -30, maxX: 30, minZ: -30, maxZ: 30 },
  };
  const input = {
    down: (...keys) => keys.includes("KeyW"),
    consume: () => false,
  };
  for (let i = 0; i < 60; i++) player.update(1 / 60, input, 0, area);
  assert.ok(player.position.z < 11);
  assert.ok(Math.cos(player.heading) < -0.9);
  input.down = () => false;
  input.consume = () => true;
  player.update(1 / 60, input, 0, area);
  input.consume = () => false;
  for (let i = 0; i < 20; i++) player.update(1 / 60, input, 0, area);
  assert.ok(player.position.y > 0 && !player.grounded);
  for (let i = 0; i < 120; i++) player.update(1 / 60, input, 0, area);
  assert.ok(player.grounded && player.position.y === 0);
  model.updateMatrixWorld(true);
  assert.ok(
    [...transforms].some(
      ([node, matrix]) => node.isBone && !node.matrix.equals(matrix),
    ),
  );
});

test("mini-games clone cowboy resources safely and rocket retains visible head, hat and face", async () => {
  const original = await loadCowboy();
  const clone = cloneAvatar(original);
  const sourceHand = original.getObjectByName("DEF-handR");
  const clonedHand = clone.getObjectByName("DEF-handR");
  assert.notEqual(sourceHand, clonedHand);
  const originalRotation = sourceHand.quaternion.clone();
  clonedHand.rotateX(0.5);
  assert.ok(sourceHand.quaternion.equals(originalRotation));
  assert.equal(clone.userData.avatarId, "cowboy");
  const originals = [];
  original.traverse((n) => {
    if (n.isMesh) originals.push(n);
  });
  let i = 0,
    originalDisposals = 0;
  clone.traverse((n) => {
    if (!n.isMesh) return;
    const source = originals[i++];
    assert.notEqual(n.geometry, source.geometry);
    assert.notEqual(n.material, source.material);
    source.geometry.addEventListener("dispose", () => originalDisposals++);
    source.material.addEventListener("dispose", () => originalDisposals++);
  });
  showAvatarPortrait(clone);
  const visible = new Set();
  clone.traverse((n) => {
    if (n.isMesh && n.visible) visible.add(n.userData.avatarPart);
  });
  assert.deepEqual(visible, new Set(["head", "hat", "face"]));
  assert.ok(originals.every((n) => n.visible));
  const scene = new THREE.Scene();
  scene.add(clone);
  disposeScene(scene);
  assert.equal(originalDisposals, 0);
});
