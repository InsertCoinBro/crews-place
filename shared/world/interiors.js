import { createArea, BUILDINGS } from "./town.js";
import { box, cylinder, label, collider, makeBench } from "./models.js";
import * as THREE from "three";
import { cabinetTexture } from "../../games/shared/art.js";
import { BOOKS, bookCoverTexture } from "../../games/library.js";

function makeLibraryShelf(area, interactions, origin) {
  const g = area.group;
  const shelfZ = -5.45;
  box(g, origin, 1.82, shelfZ, 7.9, 3.48, 0.42, 0x7b5739);
  box(g, origin, 3.55, shelfZ + 0.03, 8.15, 0.18, 0.55, 0x5e422d);
  box(g, origin, 0.18, shelfZ + 0.03, 8.15, 0.25, 0.65, 0x5e422d);
  for (const x of [origin - 3.98, origin + 3.98])
    box(g, x, 1.79, shelfZ + 0.04, 0.25, 3.45, 0.65, 0x5e422d);
  for (const y of [1.72, 3.36])
    box(g, origin, y, shelfZ + 0.08, 7.85, 0.18, 0.7, 0x66472f);
  collider(
    area,
    box(g, origin, 1.7, shelfZ - 0.18, 8, 3.4, 0.24, 0x6b4a31),
    origin,
    shelfZ - 0.18,
    8,
    0.24,
    4,
  );
  label(
    g,
    "READ-ALONG LIBRARY",
    origin,
    3.85,
    -5.78,
    7.2,
    "#fff1c7",
    "#31524b",
  );

  const slots = [];
  for (let row = 0; row < 2; row++)
    for (let col = 0; col < 6; col++)
      slots.push({
        x: origin - 2.95 + col * 1.18,
        y: row === 0 ? 0.95 : 2.57,
        z: -4.98,
      });
  slots.forEach((slot, i) => {
    const book = BOOKS[i];
    if (book) {
      const backing = box(
        g,
        slot.x,
        slot.y,
        slot.z - 0.08,
        1.08,
        1.42,
        0.16,
        0x2f261f,
      );
      backing.rotation.x = -0.05;
      const cover = new THREE.Mesh(
        new THREE.PlaneGeometry(1.02, 1.34),
        new THREE.MeshBasicMaterial({
          map: bookCoverTexture(book),
          side: THREE.DoubleSide,
        }),
      );
      cover.position.set(slot.x, slot.y, slot.z + 0.05);
      cover.rotation.x = -0.05;
      g.add(cover);
      interactions.register({
        id: "book-" + book.id,
        area: "library",
        kind: "book",
        bookId: book.id,
        x: slot.x,
        y: 0,
        z: -3.95,
        radius: 0.9,
        label: "Read " + book.title,
        hint: "Open the book",
      });
    } else {
      box(g, slot.x, slot.y, slot.z + 0.01, 0.96, 1.24, 0.1, 0xc9bd9d);
      label(
        g,
        "SOON",
        slot.x,
        slot.y + 0.01,
        slot.z + 0.075,
        0.74,
        "#e6dec7",
        "#7b6b55",
      );
    }
  });
}

export function buildInterior(scene, interactions, id, origin) {
  const arcade = id === "arcade";
  const library = id === "library";
  const halfWidth = arcade ? 9 : 7;
  const roomWidth = halfWidth * 2;
  const frontWallWidth = halfWidth - 1;
  const frontWallCenter = (halfWidth + 1) / 2;
  const title = arcade
    ? "Star Arcade"
    : library
      ? "Little Library"
      : "Recreation Club";
  const area = createArea(
    id,
    title,
    {
      minX: origin - halfWidth,
      maxX: origin + halfWidth,
      minZ: -6,
      maxZ: 6,
    },
    true,
  );
  const g = area.group;
  scene.add(g);
  g.visible = false;
  box(
    g,
    origin,
    -0.12,
    0,
    roomWidth,
    0.2,
    12,
    arcade ? 0xe7cbb6 : library ? 0xd7c6a2 : 0xdcdcb4,
  );
  for (let x = -halfWidth + 1; x <= halfWidth - 1; x += 2)
    for (let z = -5; z <= 5; z += 2)
      box(
        g,
        origin + x,
        -0.005,
        z,
        1.95,
        0.025,
        1.95,
        arcade
          ? (x + z) % 4 === 1
            ? 0xf0d7c3
            : 0xf6e7d2
          : library
            ? (x + z) % 4 === 1
              ? 0xe8d7ad
              : 0xf4e8c7
            : 0xe9e6c9,
      );
  const wallColor = arcade ? 0xddb6ae : library ? 0xd8c597 : 0xb9d6c8;
  for (const [x, z, w, d] of [
    [origin, -6, roomWidth, 0.35],
    [origin - halfWidth, 0, 0.35, 12],
    [origin + halfWidth, 0, 0.35, 12],
    [origin - frontWallCenter, 6, frontWallWidth, 0.35],
    [origin + frontWallCenter, 6, frontWallWidth, 0.35],
  ])
    collider(area, box(g, x, 2.25, z, w, 4.5, d, wallColor), x, z, w, d, 5.5);
  // Roofless dollhouse interiors keep the first camera implementation readable.
  label(
    g,
    arcade ? "STAR ARCADE" : library ? "LITTLE LIBRARY" : "RECREATION CLUB",
    origin,
    3.5,
    -5.79,
    7,
  );
  const exitDoor = box(g, origin, 1.5, 5.95, 2, 3, 0.18, 0x4c7b6c);
  collider(area, exitDoor, origin, 5.95, 2, 0.18, 3);
  label(g, "EXIT", origin, 2.5, 5.84, 1.2);
  const external = BUILDINGS.find((b) => b.id === id);
  interactions.register({
    id: id + "-exit",
    area: id,
    kind: "door",
    target: "town",
    spawn: [external.x, external.z + external.d / 2 + 2.3],
    x: origin,
    z: 4.8,
    label: "Return to town",
    hint: "Back to the neighborhood",
  });
  if (arcade) {
    const cabinets = [
      {
        x: origin - 5.6,
        z: -3.8,
        id: "gem",
        name: "Gem Garden",
        color: 0xb56ca4,
      },
      {
        x: origin - 3.6,
        z: -3.8,
        id: "bubble",
        name: "Bubble Pop",
        color: 0x65becb,
      },
      {
        x: origin,
        z: -3.8,
        id: "memory",
        name: "Memory Hop",
        color: 0xd2a457,
      },
      {
        x: origin + 3.6,
        z: -3.8,
        id: "rocket",
        name: "Rocket Flyer",
        color: 0x756497,
      },
      {
        x: origin + 5.6,
        z: -3.8,
        id: "golf",
        name: "Crew’s Putt-Putt",
        color: 0x64a56f,
      },
      {
        x: origin - 8.15,
        z: -0.6,
        rotation: Math.PI / 2,
        id: "tower",
        name: "Tower Builder",
        color: 0x8f6fc3,
      },
      {
        x: origin - 8.15,
        z: 2,
        rotation: Math.PI / 2,
        id: "brick",
        name: "Brick Out",
        color: 0xd06f5e,
      },
      {
        x: origin - 8.15,
        z: 4.4,
        rotation: Math.PI / 2,
        id: "derby",
        name: "Home Run Derby",
        color: 0xd58c4c,
      },
      {
        x: origin + 8.15,
        z: -0.6,
        rotation: -Math.PI / 2,
        id: "ski",
        name: "Downhill Ski",
        color: 0x659bc1,
      },
      {
        x: origin + 8.15,
        z: 2,
        rotation: -Math.PI / 2,
        id: "throw",
        name: "Free Throw",
        color: 0xc87942,
      },
    ];
    for (const {
      x,
      z,
      rotation = 0,
      id: gameId,
      name: gameName,
      color,
    } of cabinets) {
      const stand = new THREE.Group();
      stand.position.set(x, 0, z);
      stand.rotation.y = rotation;
      g.add(stand);
      const cabinet = box(stand, 0, 1.1, 0, 1.4, 2.2, 0.95, color);
      const sideFacing = Math.abs(Math.sin(rotation)) > 0.5;
      collider(
        area,
        cabinet,
        x,
        z,
        sideFacing ? 0.95 : 1.4,
        sideFacing ? 1.4 : 0.95,
        2.4,
      );
      box(stand, 0, 1.65, 0.49, 1.1, 0.85, 0.08, 0x294951);
      const artwork = new THREE.Mesh(
        new THREE.PlaneGeometry(1.07, 0.82),
        new THREE.MeshBasicMaterial({ map: cabinetTexture(gameId) }),
      );
      artwork.position.set(0, 1.65, 0.545);
      stand.add(artwork);
      box(stand, 0, 1.1, 0.6, 1.4, 0.16, 0.5, color);
      cylinder(stand, -0.3, 1.26, 0.65, 0.065, 0.065, 0.2, 0x355d57);
      cylinder(stand, 0.3, 1.2, 0.65, 0.1, 0.1, 0.04, 0xf2c46d);
      label(stand, gameName.toUpperCase(), 0, 2.45, 0.51, 2.1);
      const interactionDistance = 1.65;
      interactions.register({
        id: gameId + "-cabinet",
        area: id,
        kind: "minigame",
        game: gameId,
        x: x + Math.sin(rotation) * interactionDistance,
        z: z + Math.cos(rotation) * interactionDistance,
        radius: sideFacing ? 1.25 : 1.6,
        label: "Press E to play " + gameName,
        hint: "Your arcade adventure starts here",
      });
    }
    makeBench(g, origin + 4, 2.5, Math.PI / 2);
  } else if (library) {
    makeLibraryShelf(area, interactions, origin);
    box(g, origin - 4.55, 0.03, 1.8, 2.8, 0.06, 2.1, 0x9fb98b);
    makeBench(g, origin - 4.65, 2.4, Math.PI / 2);
    makeBench(g, origin + 4.65, 2.4, -Math.PI / 2);
    const readingTable = box(
      g,
      origin + 3.55,
      0.72,
      0.1,
      2.2,
      0.16,
      1.65,
      0xa87451,
    );
    collider(area, readingTable, origin + 3.55, 0.1, 2.2, 1.65, 1);
    for (const x of [origin + 2.75, origin + 4.35])
      for (const z of [-0.48, 0.68])
        box(g, x, 0.35, z, 0.12, 0.7, 0.12, 0x71513a);
    cylinder(g, origin - 0.1, 0.18, 1.2, 1.35, 1.35, 0.08, 0xc98d6a, 32);
    cylinder(g, origin - 0.1, 0.65, 1.2, 0.18, 0.22, 0.9, 0x775642, 12);
    cylinder(g, origin - 0.1, 1.15, 1.2, 0.65, 0.42, 0.62, 0xf3d783, 18);
  } else {
    const table = box(g, origin - 3, 0.8, -2, 3.2, 0.18, 2.2, 0xb98462);
    collider(area, table, origin - 3, -2, 3.2, 2.2, 1);
    for (const x of [-4, -2])
      for (const z of [-2.7, -1.3])
        box(g, origin + x, 0.4, z, 0.12, 0.8, 0.12, 0x735f4b);
    for (let i = 0; i < 5; i++)
      box(
        g,
        origin - 3.8 + i * 0.38,
        1,
        -2,
        0.25,
        0.22,
        0.3,
        [0x78a78d, 0xe6b568, 0xc68c9c][i % 3],
      );
    box(g, origin + 3, 0.02, -2, 3, 0.06, 3, 0x9bbcae);
    cylinder(g, origin + 3, 0.45, -2, 0.4, 0.4, 0.8, 0xf2d685);
    makeBench(g, origin + 4, 2.5, Math.PI / 2);
    label(g, "MAKE SOMETHING WONDERFUL", origin, 2.7, -5.78, 7);
    interactions.register({
      id: "rec-games",
      area: id,
      kind: "destination",
      destination: "rec",
      x: origin - 3,
      z: 0,
      radius: 2.5,
      label: "Creative activities",
      hint: "A future place to create",
    });
  }
  area.colliders.push({
    minX: origin + 3.55,
    maxX: origin + 4.45,
    minZ: 1.35,
    maxZ: 3.65,
    maxY: 1.5,
  });
  area.spawn = [origin, 1];
  return area;
}
