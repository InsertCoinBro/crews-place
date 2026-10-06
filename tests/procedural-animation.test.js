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
    position: { x: 0, y: 0, z: 0 },
    updateMatrixWorld: () => {},
    _bones: bones,
  };
}

for (const avatarId of ["cowboy", "jolly_robot", "moon_mischief"]) {
  test(`${avatarId}: resolves bones and updates without crashing`, () => {
    const model = mockModel(avatarId);
    const layer = new ProceduralLayer(model);
    assert.ok(layer.bones.head, "head bone resolved");
    assert.ok(layer.bones.chest, "chest bone resolved");
    // Idle for 2 seconds.
    for (let i = 0; i < 120; i++) layer.update(1 / 60, { speed: 0, grounded: true });
    // Walking.
    for (let i = 0; i < 60; i++) layer.update(1 / 60, { speed: 4, grounded: true });
    // Jump (rising then falling) + land.
    for (let i = 0; i < 30; i++) layer.update(1 / 60, { speed: 2, grounded: false, velocityY: 5 });
    for (let i = 0; i < 30; i++) layer.update(1 / 60, { speed: 2, grounded: false, velocityY: -6 });
    layer.update(1 / 60, { speed: 0, grounded: true, event: "land" });
    for (let i = 0; i < 30; i++) layer.update(1 / 60, { speed: 0, grounded: true });
    // Model scale should be back near 1 after settling.
    assert.ok(Math.abs(model.scale.y - 1) < 0.05, "scale recovered, y=" + model.scale.y);
  });

  test(`${avatarId}: procedural gestures run to completion`, () => {
    const model = mockModel(avatarId);
    const layer = new ProceduralLayer(model);
    for (const gesture of ["Wave", "Celebrate", "Nod", "ShakeHead", "LookAround"]) {
      const duration = layer.startGesture(gesture);
      assert.ok(duration > 0, `${gesture} supported`);
      const steps = Math.ceil(duration * 60) + 10;
      for (let i = 0; i < steps; i++) layer.update(1 / 60, { speed: 0, grounded: true });
      assert.ok(!layer.gestureActive, `${gesture} finished`);
    }
    assert.equal(layer.startGesture("Dance"), 0, "unknown gesture rejected");
  });

  test(`${avatarId}: gesture cancels cleanly`, () => {
    const model = mockModel(avatarId);
    const layer = new ProceduralLayer(model);
    layer.startGesture("Wave");
    layer.update(1 / 60, { speed: 0, grounded: true });
    assert.ok(layer.gestureActive);
    layer.cancelGesture();
    assert.ok(!layer.gestureActive);
  });
}
