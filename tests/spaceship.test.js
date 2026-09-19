import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { preparePlayerCharacter } from "../shared/world/player-character.js";
import { Player } from "../shared/core/player.js";
import { Spaceship, SHIP_DOCK, SHIP_EXIT } from "../shared/world/spaceship.js";

async function setup(id = "cowboy") {
  const bytes = await readFile(
    new URL(`../assets/models/${id}.glb`, import.meta.url),
  );
  const model = preparePlayerCharacter(
    await new GLTFLoader().parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    ),
    id,
  );
  const scene = new THREE.Scene(),
    group = new THREE.Group();
  scene.add(group);
  const area = {
    id: "space",
    groundY: 180,
    group,
    bounds: { minX: -83, maxX: 42, minZ: -42, maxZ: 64 },
    colliders: [],
  };
  const keys = new Set(),
    pressed = new Set();
  const game = {
    scene,
    area,
    areas: { space: area },
    mode: "playing",
    player: new Player(scene, model),
    camera: new THREE.PerspectiveCamera(),
    follow: { reset() {} },
    input: {
      lookX: 0,
      lookY: 0,
      down: (...codes) => codes.some((c) => keys.has(c)),
      consume: (c) => {
        const v = pressed.has(c);
        pressed.delete(c);
        return v;
      },
      clear() {
        keys.clear();
        pressed.clear();
      },
    },
    interactions: { register() {}, on() {} },
    ui: { toast() {}, showPrompt() {} },
    playground: { active: null },
  };
  const ship = new Spaceship(game);
  game.spaceship = ship;
  return { game, ship, keys, pressed };
}

test("spaceship docks northeast, with a transparent cockpit and two rear boosters", async () => {
  const { ship, game } = await setup();
  assert.ok(SHIP_DOCK.x > 0 && SHIP_DOCK.z < 0);
  assert.equal(ship.model.position.y, 180.3);
  assert.ok(
    ship.model.getObjectByName("clear-bubble-cockpit").material.opacity < 0.3,
  );
  assert.equal(ship.model.userData.flames.children.length, 4);
  assert.equal(
    ship.blocked(new THREE.Vector3(SHIP_EXIT.x, 180, SHIP_EXIT.z)),
    false,
  );
  game.area = { id: "town" };
  ship.update(0.02);
  assert.equal(ship.model.visible, false);
});

for (const id of ["cowboy", "jolly_robot", "moon_mischief"])
  test(`${id} remains visible in cockpit, flies, pauses, returns and exits safely`, async () => {
    const { ship, game, keys } = await setup(id);
    assert.equal(ship.board(), true);
    assert.equal(game.player.model.parent, ship.model);
    assert.equal(game.player.model.visible, true);
    assert.equal(game.player.inVehicle, true);
    keys.add("Space");
    for (let i = 0; i < 120; i++) ship.update(1 / 60);
    keys.clear();
    assert.ok(ship.model.position.y > 190);
    assert.ok(ship.model.userData.flames.visible);
    keys.add("KeyW");
    for (let i = 0; i < 120; i++) ship.update(1 / 60);
    keys.clear();
    assert.ok(ship.model.position.z > SHIP_DOCK.z + 15);
    ship.updateCamera(1 / 60);
    assert.ok(game.camera.position.toArray().every(Number.isFinite));
    game.player.model.traverse((n) =>
      assert.ok(n.quaternion.toArray().every(Number.isFinite)),
    );
    game.mode = "paused";
    const frozen = ship.model.position.clone();
    ship.update(1);
    assert.ok(ship.model.position.equals(frozen));
    ship.requestReturn();
    assert.equal(ship.phase, "flying");
    game.mode = "playing";
    ship.requestReturn();
    let sawCruise = false,
      sawLanding = false;
    for (let i = 0; i < 2000 && ship.occupied; i++) {
      ship.update(1 / 60);
      sawCruise ||= ship.returnStage === "cruise";
      sawLanding ||= ship.returnStage === "land";
    }
    assert.ok(sawCruise && sawLanding);
    assert.equal(ship.occupied, false);
    assert.equal(game.player.model.parent, game.scene);
    assert.equal(game.player.inVehicle, false);
    assert.equal(game.player.model.visible, true);
    assert.deepEqual(game.player.position.toArray(), [
      SHIP_EXIT.x,
      180,
      SHIP_EXIT.z,
    ]);
    assert.ok(ship.model.position.equals(ship.home));
    assert.equal(ship.model.userData.flames.visible, false);
    assert.equal(ship.board(), true);
    ship.exit();
    assert.equal(game.player.model.parent, game.scene);
  });

test("flight respects obstacles, horizontal limits, floor and ceiling", async () => {
  const { ship, game, keys } = await setup();
  ship.board();
  game.area.colliders.push({
    minX: 20,
    maxX: 40,
    minZ: -22,
    maxZ: -20,
    minY: 180,
    maxY: 184,
  });
  keys.add("KeyW");
  for (let i = 0; i < 200; i++) ship.update(0.05);
  assert.ok(ship.model.position.z <= -25.6);
  keys.add("Space");
  for (let i = 0; i < 250; i++) ship.update(0.05);
  assert.equal(ship.model.position.y, 235);
  assert.ok(ship.model.position.z <= 60);
  keys.clear();
  keys.add("KeyC");
  for (let i = 0; i < 250; i++) ship.update(0.05);
  assert.ok(ship.model.position.y >= 180.3);
  ship.exit();
  game.area = { id: "town" };
  assert.equal(ship.board(), false);
});
