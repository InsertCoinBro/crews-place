import test from "node:test";
import assert from "node:assert/strict";
import { ProceduralLayer } from "../shared/core/procedural-animation.js";

function mockBone() {
  return {
    rotation: { x: 0, y: 0, z: 0 },
    position: { x: 0, y: 0, z: 0 },
  };
}

function mockModel(avatarId) {
  const bones = {};
  const names = {
    cowboy: ["DEF-spine", "DEF-spine003", "DEF-spine006", "DEF-upper_armL", "DEF-forearmL", "DEF-upper_armR", "DEF-forearmR", "DEF-thighL", "DEF-thighR"],
    jolly_robot: ["DEF-hips", "DEF-body", "DEF-head", "DEF-upper_armL", "DEF-forearmL", "DEF-upper_armR", "DEF-forearmR", "DEF-thighL", "DEF-thighR"],
    moon_mischief: ["Root", "Chest", "Head", "UpperArmL", "ForearmL", "UpperArmR", "ForearmR", "DEF-thighL", "DEF-thighR"],
  }[avatarId];
  for (const n of names) bones[n] = mockBone();
  return {
    userData: { avatarId },
    getObjectByName: (n) => bones[n] || null,
    scale: { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; } },
    rotation: { x: 0, y: 0, z: 0 },
    position: { x: 0, y: 1.5, z: 0 },
    updateMatrixWorld: () => {},
    _bones: bones,
  };
}

const DT = 1 / 60;

test("chest lift does not accumulate over long runs", () => {
  for (const id of ["cowboy", "jolly_robot", "moon_mischief"]) {
    const model = mockModel(id);
    const layer = new ProceduralLayer(model);
    const chest = layer.bones.chest;
    const baseY = chest.position.y;
    for (let i = 0; i < 1800; i++) layer.update(DT, { speed: 0 });
    const drift = Math.abs(chest.position.y - baseY);
    assert(drift < 0.05, `${id}: chest drifted ${drift.toFixed(3)} (should be < 0.05)`);
  }
});

test("lean does not accumulate on the model root", () => {
  const model = mockModel("cowboy");
  const layer = new ProceduralLayer(model);
  for (let i = 0; i < 600; i++) layer.update(DT, { speed: 4 });
  assert(Math.abs(model.rotation.x) < 0.15, `model.rotation.x = ${model.rotation.x.toFixed(3)} (should be < 0.15)`);
  for (let i = 0; i < 600; i++) layer.update(DT, { speed: 0 });
  assert(Math.abs(model.rotation.x) < 0.02, `model.rotation.x = ${model.rotation.x.toFixed(3)} after stopping (should be < 0.02)`);
});

test("Celebrate returns model to original Y", () => {
  const model = mockModel("cowboy");
  const layer = new ProceduralLayer(model);
  const baseY = model.position.y;
  layer.startGesture("Celebrate");
  for (let i = 0; i < 200; i++) layer.update(DT, { speed: 0 });
  assert(!layer.gestureActive, "gesture should have finished");
  const drift = Math.abs(model.position.y - baseY);
  assert(drift < 0.01, `model Y drifted ${drift.toFixed(3)} after Celebrate (should be < 0.01)`);
});

test("cancelled Celebrate does not leave the model floating", () => {
  const model = mockModel("cowboy");
  const layer = new ProceduralLayer(model);
  const baseY = model.position.y;
  layer.startGesture("Celebrate");
  for (let i = 0; i < 30; i++) layer.update(DT, { speed: 0 });
  layer.cancelGesture();
  for (let i = 0; i < 60; i++) layer.update(DT, { speed: 0 });
  const drift = Math.abs(model.position.y - baseY);
  assert(drift < 0.01, `model Y drifted ${drift.toFixed(3)} after cancel (should be < 0.01)`);
});

test("alien float stays bounded", () => {
  const model = mockModel("moon_mischief");
  const layer = new ProceduralLayer(model);
  const hips = layer.bones.hips;
  const baseY = hips.position.y;
  for (let i = 0; i < 1800; i++) layer.update(DT, { speed: 0 });
  const drift = Math.abs(hips.position.y - baseY);
  assert(drift < 0.06, `alien hips drifted ${drift.toFixed(3)} (should be < 0.06)`);
});
