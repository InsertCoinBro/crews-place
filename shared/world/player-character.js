import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { CharacterAnimator } from "../core/character-animation.js";

// Vite fingerprints and copies this local asset into production builds.
const cowboyUrl = new URL("../../assets/models/cowboy.glb", import.meta.url)
  .href;
const robotUrl = new URL("../../assets/models/jolly_robot.glb", import.meta.url)
  .href;
export const CHARACTERS = {
  cowboy: { label: "Cowboy", url: cowboyUrl },
  jolly_robot: { label: "Jolly Robot", url: robotUrl },
};

export function preparePlayerCharacter(gltf, avatarId = "cowboy") {
  const model = new THREE.Group();
  model.name = avatarId === "jolly_robot" ? "PlayerJollyRobot" : "PlayerCowboy";
  model.userData.avatarId = avatarId;
  model.animations = gltf.animations;
  model.add(gltf.scene);
  model.traverse((node) => {
    if (node.isMesh) {
      for (
        let parent = node.parent;
        !node.userData.avatarPart && parent;
        parent = parent.parent
      ) {
        if (parent.userData.avatarPart)
          node.userData.avatarPart = parent.userData.avatarPart;
      }
      node.castShadow = true;
      node.receiveShadow = true;
      if (node.isSkinnedMesh) node.frustumCulled = false;
    }
  });
  model.updateMatrixWorld(true);
  if (model.animations.length) model.animator = new CharacterAnimator(model);
  return model;
}

export async function loadPlayerCharacter(avatarId = "cowboy") {
  const definition = CHARACTERS[avatarId];
  if (!definition) throw new Error("Unknown character: " + avatarId);
  try {
    return preparePlayerCharacter(
      await new GLTFLoader().loadAsync(definition.url),
      avatarId,
    );
  } catch (cause) {
    throw new Error(
      `The ${definition.label} character could not load. Reload the page and check that the game server is running.`,
      { cause },
    );
  }
}
