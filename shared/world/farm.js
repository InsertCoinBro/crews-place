import * as THREE from "three";
import { blob, box, cylinder, label, material } from "./models.js";

const FARM_NARRATION_AUDIO = Object.freeze({
  cow: new URL("../../assets/audio/voice/farm-cow.mp3", import.meta.url).href,
  horse: new URL("../../assets/audio/voice/farm-horse.mp3", import.meta.url)
    .href,
  pig: new URL("../../assets/audio/voice/farm-pig.mp3", import.meta.url).href,
  sheep: new URL("../../assets/audio/voice/farm-sheep.mp3", import.meta.url)
    .href,
  goat: new URL("../../assets/audio/voice/farm-goat.mp3", import.meta.url).href,
  chicken: new URL("../../assets/audio/voice/farm-chicken.mp3", import.meta.url)
    .href,
  duck: new URL("../../assets/audio/voice/farm-duck.mp3", import.meta.url).href,
  rabbit: new URL("../../assets/audio/voice/farm-rabbit.mp3", import.meta.url)
    .href,
});

// This is the open-countryside spot chosen by the player on September 7, 2026.
// The footprint is intentionally close to Rainbow Rush's 125 x 54 map footprint.
export const FARM_SITE = Object.freeze({
  x: -43,
  z: 59,
  playerAnchor: Object.freeze({ x: -52, z: 50 }),
  width: 90,
  depth: 58,
});
export const FARM_BOUNDS = Object.freeze({
  minX: FARM_SITE.x - FARM_SITE.width / 2,
  maxX: FARM_SITE.x + FARM_SITE.width / 2,
  minZ: FARM_SITE.z - FARM_SITE.depth / 2,
  maxZ: FARM_SITE.z + FARM_SITE.depth / 2,
});

export const FARM_ANIMALS = Object.freeze([
  {
    id: "cow",
    name: "Cow",
    emoji: "🐄",
    x: -77,
    z: 42,
    color: 0xf4eee0,
    accent: 0x5b5148,
    fact: "Cows eat grass and hay. Dairy cows can give milk, and their gentle moo helps the herd talk to one another.",
    job: "Dairy cows can provide milk. Cows also help turn grass into useful food for people.",
    food: "Grass and hay",
    sound: "Moo",
  },
  {
    id: "horse",
    name: "Horse",
    emoji: "🐴",
    x: -59,
    z: 42,
    color: 0xa9683f,
    accent: 0x49362d,
    fact: "Horses are strong, social animals. They can carry riders, pull farm equipment, and run very quickly.",
    job: "Horses can carry riders and pull carts or light farm equipment.",
    food: "Grass, hay, and oats",
    sound: "Neigh or whinny",
  },
  {
    id: "pig",
    name: "Pig",
    emoji: "🐖",
    x: -41,
    z: 42,
    color: 0xf2a7ac,
    accent: 0xd77782,
    fact: "Pigs are clever animals with an excellent sense of smell. They use their snouts to explore and root in the soil.",
    job: "Pigs use their strong snouts to turn soil and can help clear plants from the ground.",
    food: "Grains, vegetables, and fruit",
    sound: "Oink",
  },
  {
    id: "sheep",
    name: "Sheep",
    emoji: "🐑",
    x: -23,
    z: 42,
    color: 0xf3eee1,
    accent: 0x665c55,
    fact: "Sheep grow a warm coat called wool. Farmers carefully shear the wool so it can be made into clothing and blankets.",
    job: "Sheep grow wool that can be made into clothing, yarn, and blankets.",
    food: "Grass and hay",
    sound: "Baa",
  },
  {
    id: "goat",
    name: "Goat",
    emoji: "🐐",
    x: -77,
    z: 62,
    color: 0xd8c49e,
    accent: 0x76604d,
    fact: "Goats are curious climbers. They eat plants, and some goats provide milk that can be used to make cheese.",
    job: "Goats can provide milk and help clear brush by nibbling leafy plants.",
    food: "Leaves, grass, and hay",
    sound: "Bleat or maa",
  },
  {
    id: "chicken",
    name: "Chicken",
    emoji: "🐔",
    x: -59,
    z: 62,
    color: 0xc66a42,
    accent: 0xf0c04f,
    fact: "Chickens scratch the ground to find seeds and insects. Hens lay eggs and use clucks to communicate with their flock.",
    job: "Hens lay eggs, and chickens help the farm by eating small insects.",
    food: "Seeds, grain, and insects",
    sound: "Cluck",
  },
  {
    id: "duck",
    name: "Duck",
    emoji: "🦆",
    x: -41,
    z: 62,
    color: 0xf1d268,
    accent: 0xe28a35,
    fact: "Ducks have waterproof feathers and webbed feet. They paddle in water and search for plants, seeds, and tiny insects.",
    job: "Ducks can lay eggs and help around wet farm areas by eating insects and slugs.",
    food: "Plants, seeds, and insects",
    sound: "Quack",
  },
  {
    id: "rabbit",
    name: "Rabbit",
    emoji: "🐇",
    x: -23,
    z: 62,
    color: 0xc9b8a6,
    accent: 0xe7a6a9,
    fact: "Rabbits use their long ears to listen for sounds. They nibble hay and vegetables and dig safe burrows with strong feet.",
    job: "Rabbits are gentle small farm animals, and their bedding can be composted for gardens.",
    food: "Hay, leafy greens, and vegetables",
    sound: "Usually quiet; they may thump their feet",
  },
]);

export function narrationFor(animal) {
  return `This is the ${animal.name.toLowerCase()}. ${animal.fact} On the farm: ${animal.job} It eats: ${animal.food}. The sound it makes is: ${animal.sound}.`;
}

function addCollider(area, x, z, width, depth, maxY = 2) {
  area.colliders.push({
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
    maxY,
  });
}

function fenceSegment(parent, area, x1, z1, x2, z2) {
  const horizontal = z1 === z2;
  const length = Math.hypot(x2 - x1, z2 - z1);
  const x = (x1 + x2) / 2;
  const z = (z1 + z2) / 2;
  for (const y of [0.52, 1.08])
    box(
      parent,
      x,
      y,
      z,
      horizontal ? length : 0.12,
      0.12,
      horizontal ? 0.12 : length,
      0xf0e1bc,
    );
  const posts = Math.max(1, Math.round(length / 3));
  for (let i = 0; i <= posts; i++) {
    const t = i / posts;
    box(
      parent,
      THREE.MathUtils.lerp(x1, x2, t),
      0.72,
      THREE.MathUtils.lerp(z1, z2, t),
      0.18,
      1.44,
      0.18,
      0x9a704b,
    );
  }
  addCollider(
    area,
    x,
    z,
    horizontal ? length : 0.22,
    horizontal ? 0.22 : length,
    1.5,
  );
}

function buildStall(parent, area, animal, index) {
  const halfW = 7.2;
  const halfD = 7;
  const facesAisleFromNorth = index < 4;
  const frontZ = animal.z + (facesAisleFromNorth ? halfD : -halfD);
  const backZ = animal.z - (facesAisleFromNorth ? halfD : -halfD);
  const gateHalf = 1.8;

  // The split front fence leaves a generous 3.6-unit opening into every stall.
  fenceSegment(parent, area, animal.x - halfW, backZ, animal.x + halfW, backZ);
  fenceSegment(
    parent,
    area,
    animal.x - halfW,
    animal.z - halfD,
    animal.x - halfW,
    animal.z + halfD,
  );
  fenceSegment(
    parent,
    area,
    animal.x + halfW,
    animal.z - halfD,
    animal.x + halfW,
    animal.z + halfD,
  );
  fenceSegment(
    parent,
    area,
    animal.x - halfW,
    frontZ,
    animal.x - gateHalf,
    frontZ,
  );
  fenceSegment(
    parent,
    area,
    animal.x + gateHalf,
    frontZ,
    animal.x + halfW,
    frontZ,
  );

  const signZ = frontZ + (facesAisleFromNorth ? 0.2 : -0.2);
  box(parent, animal.x, 1, signZ, 0.12, 1.55, 0.12, 0x78563d);
  const sign = label(
    parent,
    `${animal.emoji}  ${animal.name.toUpperCase()}  ·  E`,
    animal.x,
    1.72,
    signZ,
    4.8,
    "#fff1c9",
    "#365b50",
  );
  if (!facesAisleFromNorth) sign.rotation.y = Math.PI;
  sign.name = `${animal.id}-learning-sign`;

  // Every animal has water and a species-appropriate bit of habitat.
  box(parent, animal.x + 4.7, 0.38, animal.z, 2.4, 0.7, 1.05, 0x80654c).name =
    "water-trough";
  box(parent, animal.x + 4.7, 0.75, animal.z, 2.05, 0.05, 0.7, 0x79b8bd);
  if (animal.id === "pig") {
    const mud = cylinder(
      parent,
      animal.x - 3.4,
      0.035,
      animal.z - 1.7,
      2.1,
      2.1,
      0.06,
      0x9a765d,
      22,
    );
    mud.scale.z = 0.62;
    mud.name = "pig-mud-patch";
  }
  if (animal.id === "duck") {
    const pond = cylinder(
      parent,
      animal.x - 2.8,
      0.04,
      animal.z + 1.2,
      2.35,
      2.35,
      0.07,
      0x78bfc2,
      24,
    );
    pond.scale.z = 0.62;
    pond.name = "duck-pond";
  }
  if (animal.id === "chicken" || animal.id === "rabbit") {
    const home = box(
      parent,
      animal.x - 4.2,
      1.05,
      animal.z - 1.6,
      3.2,
      2.1,
      2.5,
      animal.id === "chicken" ? 0xd48b53 : 0xad855f,
    );
    home.name = animal.id === "chicken" ? "chicken-coop" : "rabbit-hutch";
    box(
      parent,
      animal.x - 4.2,
      1.05,
      animal.z - (facesAisleFromNorth ? 0.32 : 2.88),
      1.15,
      1.35,
      0.08,
      0x4f4338,
    );
  }

  return {
    ...animal,
    frontZ,
    signX: animal.x,
    signZ,
    gate: { x: animal.x, z: frontZ, width: gateHalf * 2 },
  };
}

function limb(parent, x, z, color, height = 0.72) {
  cylinder(parent, x, height / 2, z, 0.09, 0.11, height, color, 7);
}

function makeAnimal(animal) {
  const g = new THREE.Group();
  g.name = `${animal.name} animal`;
  const body = blob(g, 0, 0.92, 0, 0.72, animal.color, 1);
  body.scale.set(1.35, 0.78, 0.72);
  const head = blob(
    g,
    0,
    1.22,
    0.73,
    animal.id === "chicken" || animal.id === "duck" ? 0.32 : 0.42,
    animal.color,
    1,
  );
  head.name = "head";
  for (const x of [-0.42, 0.42])
    for (const z of [-0.38, 0.35])
      limb(
        g,
        x,
        z,
        animal.accent,
        animal.id === "chicken" || animal.id === "duck" ? 0.48 : 0.72,
      );
  for (const x of [-0.16, 0.16]) blob(g, x, 1.32, 1.09, 0.045, 0x263f3b);

  if (["cow", "horse", "sheep", "goat", "rabbit"].includes(animal.id)) {
    for (const x of [-0.26, 0.26]) {
      const ear = box(
        g,
        x,
        1.58,
        0.7,
        animal.id === "rabbit" ? 0.16 : 0.24,
        animal.id === "rabbit" ? 0.8 : 0.24,
        0.12,
        animal.accent,
      );
      ear.rotation.z = x * 0.45;
    }
  }
  if (["cow", "goat"].includes(animal.id))
    for (const x of [-0.25, 0.25]) {
      const horn = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.38, 7),
        material(0xf4dfb6),
      );
      horn.position.set(x, 1.72, 0.66);
      horn.rotation.z = x * 0.55;
      horn.castShadow = true;
      g.add(horn);
    }
  if (animal.id === "pig") {
    const snout = cylinder(g, 0, 1.18, 1.09, 0.2, 0.2, 0.2, 0xd97886, 12);
    snout.rotation.x = Math.PI / 2;
  }
  if (animal.id === "sheep")
    for (const p of [
      [-0.45, 1.16, 0],
      [0.42, 1.12, -0.1],
      [0, 1.35, -0.28],
    ])
      blob(g, ...p, 0.34, 0xfffbec, 1);
  if (animal.id === "chicken") {
    const comb = blob(g, 0, 1.62, 0.72, 0.16, 0xd9554c);
    comb.scale.y = 1.5;
    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.13, 0.36, 4),
      material(0xefb543),
    );
    beak.position.set(0, 1.22, 1.1);
    beak.rotation.x = Math.PI / 2;
    g.add(beak);
  }
  if (animal.id === "duck") {
    const beak = box(g, 0, 1.18, 1.08, 0.38, 0.12, 0.34, 0xe58b36);
    beak.rotation.x = 0.05;
  }
  if (animal.id === "rabbit") blob(g, 0, 0.92, -0.72, 0.25, 0xf4eee4, 1);
  return g;
}

function buildBarn(parent, area) {
  const x = -74,
    z = 79;
  const body = box(parent, x, 3.3, z, 25, 6.6, 13, 0xb94f45);
  body.name = "big-red-barn";
  addCollider(area, x, z, 25, 13, 10);
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(10.7, 7, 4),
    material(0x75433d),
  );
  roof.position.set(x, 8.15, z);
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = 1.05;
  roof.castShadow = true;
  parent.add(roof);
  box(parent, x, 3.15, z - 6.56, 7.8, 5.7, 0.18, 0x4f392f);
  for (const dx of [-2, 2])
    box(parent, x + dx, 3.15, z - 6.68, 3.75, 5.45, 0.12, 0xe8d9b2);
  const barnLabel = label(
    parent,
    "FRIENDLY FARM BARN",
    x,
    7.02,
    z - 6.8,
    10,
    "#fff0c5",
    "#6e302f",
  );
  barnLabel.rotation.y = Math.PI;
}

function buildFarmyard(parent, area) {
  // A packed-earth path begins at the old town garden opening and crosses the farm.
  box(parent, -47, 0.015, 52, 82, 0.055, 4.8, 0xd4b27f);
  box(parent, -6, 0.016, 41, 4.8, 0.055, 26, 0xd4b27f);
  label(
    parent,
    "WELCOME TO FRIENDLY FARM",
    -7.5,
    4.7,
    31.2,
    13,
    "#fff0bd",
    "#3c6555",
  );
  for (const x of [-13.5, -1.5])
    box(parent, x, 2.3, 31.35, 0.3, 4.6, 0.3, 0x845e40);

  buildBarn(parent, area);
  cylinder(parent, -45, 4.3, 80, 4.2, 4.4, 8.6, 0xb9c5bd, 18).name =
    "farm-silo";
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(4.25, 2.5, 18),
    material(0x7b8f89),
  );
  cap.position.set(-45, 9.8, 80);
  cap.castShadow = true;
  parent.add(cap);
  addCollider(area, -45, 80, 8.7, 8.7, 11);

  for (const [x, z, r] of [
    [-33, 79, 0],
    [-26, 80, 0.2],
    [-18, 78, -0.1],
    [-13, 70, 0.1],
  ]) {
    const bale = cylinder(parent, x, 1.1, z, 1.05, 1.05, 2.2, 0xd8ad4f, 12);
    bale.rotation.z = Math.PI / 2;
    bale.rotation.y = r;
    bale.name = "hay-bale";
  }
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 6; col++) {
      const x = -40 + col * 2.1,
        z = 72 + row * 1.35;
      cylinder(parent, x, 0.35, z, 0.035, 0.055, 0.7, 0x5f8b4f, 5);
      blob(parent, x, 0.7, z, 0.18, [0xe6c64f, 0xc96a45, 0x87a950][col % 3]);
    }
  for (const [x, z] of [
    [-87, 36],
    [-87, 48],
    [-87, 60],
    [-87, 72],
    [-8, 84],
    [-17, 87],
    [-28, 87],
  ]) {
    blob(parent, x, 0.55, z, 1.05, 0x6f9b63, 1).name = "farm-bush";
  }
}

export class Farm {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.group.name = "Friendly Farm";
    game.areas.town.group.add(this.group);
    box(
      this.group,
      FARM_SITE.x,
      -0.01,
      FARM_SITE.z,
      FARM_SITE.width,
      0.045,
      FARM_SITE.depth,
      0xa9c77d,
    ).name = "farm-meadow";
    buildFarmyard(this.group, game.areas.town);
    this.stalls = FARM_ANIMALS.map((animal, index) =>
      buildStall(this.group, game.areas.town, animal, index),
    );
    this.animals = this.stalls.map((animal, index) => {
      const model = makeAnimal(animal);
      model.position.set(
        animal.x + (index % 2 ? 1.3 : -1.1),
        0,
        animal.z + ((index % 3) - 1) * 1.1,
      );
      model.rotation.y = index < 4 ? 0 : Math.PI;
      model.userData.phase = index * 0.73;
      this.group.add(model);
      return model;
    });
    for (const stall of this.stalls)
      game.interactions.register({
        id: `farm-sign-${stall.id}`,
        area: "town",
        kind: "farm-sign",
        animalId: stall.id,
        x: stall.signX,
        z: stall.signZ,
        radius: 3.25,
        label: `Learn about the ${stall.name.toLowerCase()}`,
        hint: `Press E to hear what a ${stall.name.toLowerCase()} does`,
      });
    game.interactions.on("farm-sign", (item) => this.openSign(item.animalId));
    this.buildCard();
  }

  buildCard() {
    this.card = document.createElement("section");
    this.card.className = "farm-fact-card";
    this.card.hidden = true;
    this.card.setAttribute("aria-live", "polite");
    this.card.innerHTML = `<span class="farm-card-tag">MEET THE ANIMALS</span><h2></h2><p data-animal-intro></p><dl><div><dt>What I do</dt><dd data-animal-job></dd></div><div><dt>What I eat</dt><dd data-animal-food></dd></div><div><dt>My sound</dt><dd data-animal-sound></dd></div></dl><p class="farm-audio-status" data-farm-status role="status"></p><div class="farm-card-actions"><button data-farm-read aria-label="Read this animal lesson aloud">🔊 Read aloud again</button><button data-farm-close>Close</button></div>`;
    document.querySelector("#hud").append(this.card);
    this.card
      .querySelector("[data-farm-read]")
      .addEventListener("click", () => this.speak());
    this.card
      .querySelector("[data-farm-close]")
      .addEventListener("click", () => this.closeSign());
  }

  openSign(animalId) {
    const animal = FARM_ANIMALS.find((item) => item.id === animalId);
    if (!animal) return false;
    this.current = animal;
    this.card.querySelector("h2").textContent =
      `${animal.emoji} ${animal.name}`;
    this.card.querySelector("[data-animal-intro]").textContent = animal.fact;
    this.card.querySelector("[data-animal-job]").textContent = animal.job;
    this.card.querySelector("[data-animal-food]").textContent = animal.food;
    this.card.querySelector("[data-animal-sound]").textContent = animal.sound;
    this.card.hidden = false;
    this.speak();
    return true;
  }

  speak() {
    if (!this.current) return false;
    this.stopAudio();
    const text = narrationFor(this.current);
    this.lastNarration = text;
    const status = this.card.querySelector("[data-farm-status]");
    const track = FARM_NARRATION_AUDIO[this.current.id];
    if (track) {
      const audio = new Audio(track);
      audio.preload = "auto";
      audio.volume = 1;
      audio.onplay = () => {
        status.textContent = "🔊 Reading this lesson aloud";
      };
      audio.onended = () => {
        if (this.audio === audio) {
          status.textContent = "Finished reading. You can play it again.";
          this.audio = null;
        }
      };
      audio.onerror = () => this.tryBrowserSpeech(text);
      this.audio = audio;
      audio.play().catch(() => this.tryBrowserSpeech(text));
      return true;
    }
    return this.tryBrowserSpeech(text);
  }

  tryBrowserSpeech(text) {
    if (
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      this.card.querySelector("[data-farm-status]").textContent =
        "Audio could not start. Check that this Chrome tab is not muted, then press Read aloud again.";
      return false;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1.03;
    utterance.onstart = () => {
      this.card.querySelector("[data-farm-status]").textContent =
        "🔊 Reading this lesson aloud";
    };
    utterance.onend = () => {
      this.card.querySelector("[data-farm-status]").textContent =
        "Finished reading. You can play it again.";
    };
    utterance.onerror = () => {
      this.card.querySelector("[data-farm-status]").textContent =
        "Audio could not start. Check that this Chrome tab is not muted, then press Read aloud again.";
    };
    window.speechSynthesis.speak(utterance);
    return true;
  }

  stopAudio() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    window.speechSynthesis?.cancel?.();
  }

  closeSign() {
    this.stopAudio();
    if (this.card) this.card.hidden = true;
    this.current = null;
    this.game?.canvas?.focus?.();
  }

  update(dt) {
    this.elapsed = (this.elapsed ?? 0) + dt;
    for (const model of this.animals) {
      const phase = this.elapsed * 1.35 + model.userData.phase;
      model.position.y = Math.sin(phase) * 0.025;
      model.rotation.y += Math.sin(phase * 0.47) * dt * 0.035;
      const head = model.getObjectByName("head");
      if (head) head.rotation.x = Math.sin(phase * 0.8) * 0.08;
    }
  }
}
