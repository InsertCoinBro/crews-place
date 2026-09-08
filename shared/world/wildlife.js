import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Route } from "./routes.js";

const horseUrl = new URL("../../assets/models/horse_npc.glb", import.meta.url)
  .href;

export const HORSE_ROUTE = new Route([
  [-70, 34],
  [-47, 34],
  [-43, 54],
  [-52, 66],
  [-72, 61],
]);

export async function loadHorseNPC() {
  try {
    return await new GLTFLoader().loadAsync(horseUrl);
  } catch (cause) {
    throw new Error("The meadow horse could not load.", { cause });
  }
}

export function prepareHorseNPC(gltf) {
  const model = gltf.scene;
  model.name = "MeadowHorse";
  model.userData.animalType = "horse";
  model.animations = gltf.animations;
  model.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    if (node.isSkinnedMesh) node.frustumCulled = false;
  });
  return model;
}

export class Wildlife {
  constructor(group, horseGltf = null) {
    this.animals = [];
    this.horse = null;
    if (!horseGltf) return;

    const model = prepareHorseNPC(horseGltf);
    group.add(model);
    const mixer = new THREE.AnimationMixer(model);
    const actions = new Map(
      model.animations.map((clip) => [clip.name, mixer.clipAction(clip)]),
    );
    this.horse = {
      model,
      mixer,
      actions,
      route: HORSE_ROUTE,
      distance: 0,
      speed: 0.62,
      state: null,
    };
    this.animals.push(this.horse);
    this.setHorseState("Walk", 0);
    this.update(0);
  }

  setHorseState(name, fade = 0.2) {
    const horse = this.horse;
    if (!horse || horse.state === name) return;
    const previous = horse.actions.get(horse.state);
    const next = horse.actions.get(name);
    if (!next) return;
    next.reset().play();
    if (previous && fade) {
      previous.fadeOut(fade);
      next.fadeIn(fade);
    } else previous?.stop();
    horse.state = name;
    horse.model.userData.animationState = name;
  }

  update(dt, player = null) {
    const horse = this.horse;
    if (!horse) return;
    const ahead = horse.route.sample(horse.distance + 0.8);
    const resting =
      player &&
      player.position.y < 2.5 &&
      Math.hypot(player.position.x - ahead.x, player.position.z - ahead.z) <
        3.4;
    this.setHorseState(resting ? "Idle" : "Walk");
    if (!resting) horse.distance += dt * horse.speed;
    const point = horse.route.sample(horse.distance);
    horse.model.position.set(point.x, 0, point.z);
    horse.model.rotation.y = point.heading;
    horse.mixer.update(dt);
  }
}
