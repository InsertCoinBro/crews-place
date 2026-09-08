import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { preparePlayerCharacter } from "../shared/world/player-character.js";
import { Player } from "../shared/core/player.js";
import {
  cloneAvatar,
  showAvatarPortrait,
  disposeScene,
} from "../games/shared/scene.js";

const clips = [
  "Idle",
  "Walk",
  "Run",
  "Jump",
  "Fall",
  "Land",
  "Wave",
  "Celebrate",
  "LookAround",
  "Nod",
  "ShakeHead",
];
async function robot() {
  const file = await readFile(
    new URL("../assets/models/jolly_robot.glb", import.meta.url),
  );
  return preparePlayerCharacter(
    await new GLTFLoader().parseAsync(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength),
      "",
    ),
    "jolly_robot",
  );
}
function pose(model) {
  model.updateMatrixWorld(true);
  const result = [];
  model.traverse((o) => {
    if (o.isBone) result.push(...o.matrixWorld.elements);
  });
  return result;
}
const differs = (a, b) => a.some((v, i) => Math.abs(v - b[i]) > 1e-5);

test("Rigify robot ships all eleven nonempty clips, skin, morphs and a grounded 1.85m body", async () => {
  const model = await robot();
  assert.deepEqual(
    new Set(model.animations.map((c) => c.name)),
    new Set(clips),
  );
  const bounds = new THREE.Box3().setFromObject(model);
  assert.ok(Math.abs(bounds.min.y) < 1e-4, `feet at ${bounds.min.y}`);
  assert.ok(Math.abs(bounds.max.y - 1.85) < 1e-3, `height ${bounds.max.y}`);
  let bones = 0,
    skinned = 0;
  const parts = new Set();
  model.traverse((o) => {
    assert.ok(
      !o.isCamera && !o.isLight && !/studio|metarig|ORG-|WGT-/i.test(o.name),
      o.name,
    );
    if (o.isBone) bones++;
    if (o.isSkinnedMesh) skinned++;
    if (o.isMesh) parts.add(o.userData.avatarPart);
  });
  assert.equal(bones, 15);
  assert.ok(skinned >= 3);
  assert.deepEqual(parts, new Set(["body", "head", "face"]));
  for (const clip of model.animations) {
    assert.ok(clip.duration > 0.3);
    assert.ok(clip.tracks.some((t) => t.name.includes("quaternion")));
    assert.ok(
      clip.tracks.some((t) => t.name.includes("morphTargetInfluences")),
      clip.name,
    );
    for (const track of clip.tracks)
      assert.ok([...track.values].every(Number.isFinite));
    model.animator.mixer.stopAllAction();
    const action = model.animator.mixer.clipAction(clip).reset().play();
    model.animator.mixer.setTime(0);
    const first = pose(model);
    model.animator.mixer.setTime(clip.duration * 0.37);
    const middle = pose(model);
    assert.ok(
      differs(first, middle),
      `${clip.name} has no evaluated bone motion`,
    );
    action.stop();
  }
});

test("robot expressions follow running, jumping and gestures; motions blend and yield to gameplay", async () => {
  const model = await robot();
  const animator = model.animator;
  const face = model.getObjectByProperty("isMesh", true);
  let expressive;
  model.traverse((o) => {
    if (o.morphTargetDictionary?.Surprised !== undefined) expressive = o;
  });
  assert.ok(expressive);
  animator.update(0.25, { speed: 8.2, running: true });
  assert.equal(animator.current, "Run");
  assert.ok(
    expressive.morphTargetInfluences[expressive.morphTargetDictionary.Focused] >
      0.6,
  );
  animator.update(0.25, { grounded: false, velocityY: 4 });
  assert.equal(animator.current, "Jump");
  animator.update(0.25, { grounded: false, velocityY: -2 });
  assert.equal(animator.current, "Fall");
  assert.ok(
    expressive.morphTargetInfluences[
      expressive.morphTargetDictionary.Surprised
    ] > 0.9,
  );
  animator.update(0.05, { event: "land" });
  assert.equal(animator.current, "Land");
  animator.update(0.4);
  animator.update(0.01);
  assert.equal(animator.current, "Idle");
  for (const name of ["Wave", "Celebrate", "LookAround", "Nod", "ShakeHead"]) {
    assert.ok(animator.trigger(name));
    animator.update(0.2);
    assert.equal(animator.current, name);
    animator.update(5);
    animator.update(0.01);
    assert.equal(animator.current, "Idle");
  }
  animator.trigger("Wave");
  animator.update(0.1, { speed: 3 });
  assert.equal(animator.current, "Walk");
  assert.equal(animator.gestureTime, 0);
});

test("real Player controls switch walk/run/air states and stop walking against walls", async () => {
  const model = await robot();
  const player = new Player(new THREE.Scene(), model);
  const held = new Set(),
    pressed = new Set();
  const input = {
    down: (...keys) => keys.some((k) => held.has(k)),
    consume: (key) => {
      const v = pressed.has(key);
      pressed.delete(key);
      return v;
    },
  };
  const area = {
    colliders: [],
    bounds: { minX: -50, maxX: 50, minZ: -50, maxZ: 50 },
  };
  held.add("KeyW");
  for (let i = 0; i < 40; i++) player.update(1 / 60, input, 0, area);
  assert.equal(model.animator.current, "Walk");
  const walking = player.actualSpeed;
  held.add("ShiftLeft");
  for (let i = 0; i < 40; i++) player.update(1 / 60, input, 0, area);
  assert.equal(model.animator.current, "Run");
  assert.ok(player.actualSpeed > walking * 1.4);
  pressed.add("Space");
  player.update(1 / 60, input, 0, area);
  assert.equal(model.animator.current, "Jump");
  let sawFall = false,
    sawLand = false;
  held.clear();
  for (let i = 0; i < 80; i++) {
    player.update(1 / 60, input, 0, area);
    sawFall ||= model.animator.current === "Fall";
    sawLand ||= model.animator.current === "Land";
  }
  assert.ok(sawFall && sawLand);
  assert.ok(player.grounded);
  player.teleport(0, 1);
  area.colliders = [{ minX: -5, maxX: 5, minZ: -2, maxZ: 0, maxY: 4 }];
  held.add("KeyW");
  for (let i = 0; i < 90; i++) player.update(1 / 60, input, 0, area);
  assert.equal(model.animator.current, "Idle");
});

test("robot mini-game clones have independent bones, expressions and disposable resources", async () => {
  const source = await robot();
  const copy = cloneAvatar(source);
  const a = source.getObjectByName("DEF-head"),
    b = copy.getObjectByName("DEF-head");
  assert.notEqual(a, b);
  const initial = a.quaternion.clone();
  copy.animator.trigger("Nod");
  copy.animator.update(0.5);
  assert.ok(a.quaternion.equals(initial));
  assert.ok(!b.quaternion.equals(a.quaternion));
  let disposed = 0;
  source.traverse((o) => {
    if (o.isMesh) o.geometry.addEventListener("dispose", () => disposed++);
  });
  showAvatarPortrait(copy);
  const visible = new Set();
  copy.traverse((o) => {
    if (o.isMesh && o.visible) visible.add(o.userData.avatarPart);
  });
  assert.deepEqual(visible, new Set(["head", "face"]));
  const scene = new THREE.Scene();
  scene.add(copy);
  disposeScene(scene);
  assert.equal(disposed, 0);
});
