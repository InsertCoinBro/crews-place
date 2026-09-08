import * as THREE from "three";
const materials = new Map();
export function material(color) {
  if (!materials.has(color))
    materials.set(
      color,
      new THREE.MeshStandardMaterial({
        color,
        roughness: 0.85,
        flatShading: true,
      }),
    );
  return materials.get(color);
}
export function box(parent, x, y, z, w, h, d, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
export function cylinder(
  parent,
  x,
  y,
  z,
  top,
  bottom,
  height,
  color,
  segments = 10,
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(top, bottom, height, segments),
    material(color),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
export function blob(parent, x, y, z, r, color, detail = 0) {
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(r, detail),
    material(color),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
export function label(
  parent,
  text,
  x,
  y,
  z,
  width = 4,
  color = "#fff4db",
  ink = "#214e4b",
) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 768, 160);
  ctx.fillStyle = ink;
  ctx.font = "bold 58px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 384, 82, 710);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, (width * 160) / 768),
    new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
  );
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
export function makeCharacter(color = 0xe4ac4c, player = false) {
  const g = new THREE.Group();
  box(g, 0, 0.96, 0, 0.63, 0.63, 0.39, color).name = "body";
  blob(g, 0, 1.52, 0, 0.34, 0xf1cba2, 1).name = "head";
  const cap = cylinder(
    g,
    0,
    1.77,
    0,
    0.31,
    0.34,
    0.13,
    player ? 0x3b7f72 : 0x637b87,
    10,
  );
  cap.rotation.z = 0.06;
  cap.name = "cap";
  box(g, 0, 1.76, 0.25, 0.37, 0.055, 0.25, player ? 0x3b7f72 : 0x637b87).name =
    "visor";
  for (const x of [-0.12, 0.12])
    box(g, x, 1.55, 0.298, 0.045, 0.06, 0.035, 0x274543).name = "eye";
  if (player) box(g, 0, 1, -0.27, 0.43, 0.46, 0.22, 0xd78842).name = "backpack";
  for (const [name, x] of [
    ["left", -0.19],
    ["right", 0.19],
  ]) {
    const leg = new THREE.Group();
    leg.name = name + "Leg";
    leg.position.set(x, 0.67, 0);
    g.add(leg);
    box(leg, 0, -0.25, 0, 0.24, 0.5, 0.27, 0x426979);
    box(leg, 0, -0.58, 0.06, 0.28, 0.17, 0.42, 0xfff3d7);
    g.userData[name + "Leg"] = leg;
    const arm = new THREE.Group();
    arm.name = name + "Arm";
    arm.position.set(x * 2, 0.0 + 1.2, 0);
    g.add(arm);
    box(arm, 0, -0.19, 0, 0.18, 0.37, 0.22, color);
    blob(arm, 0, -0.43, 0, 0.12, 0xf1cba2);
    g.userData[name + "Arm"] = arm;
  }
  return g;
}
export function makeTree(parent, x, z, size = 1, color = 0x77ad69) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.scale.setScalar(size);
  parent.add(g);
  cylinder(g, 0, 1.25, 0, 0.17, 0.26, 2.5, 0x957050, 7);
  blob(g, 0, 3, 0, 1.5, color, 1);
  blob(g, -0.75, 2.65, 0.1, 0.93, color);
  blob(g, 0.65, 2.85, 0.3, 1.1, color);
  return g;
}
export function makeBench(parent, x, z, rotation = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotation;
  parent.add(g);
  for (const xx of [-0.85, 0.85]) {
    box(g, xx, 0.35, 0, 0.12, 0.7, 0.75, 0x426968);
    box(g, xx, 0.8, -0.3, 0.1, 0.9, 0.1, 0x426968);
  }
  for (const zz of [-0.27, 0, 0.27])
    box(g, 0, 0.69, zz, 2.2, 0.12, 0.22, 0xba8757);
  for (const yy of [0.98, 1.27]) box(g, 0, yy, -0.35, 2.2, 0.22, 0.1, 0xc99a66);
  return g;
}
export function makeCar(color) {
  const g = new THREE.Group();
  box(g, 0, 0.6, 0, 1.45, 0.55, 2.7, color);
  box(g, 0, 1.05, -0.12, 1.2, 0.58, 1.4, color);
  box(g, 0, 1.11, 0.598, 1.04, 0.38, 0.035, 0xb8dee0);
  box(g, 0, 1.11, -0.838, 1.04, 0.38, 0.035, 0xb8dee0);
  for (const x of [-0.611, 0.611])
    box(g, x, 1.12, -0.12, 0.03, 0.35, 1.1, 0xb8dee0);
  for (const x of [-0.75, 0.75])
    for (const z of [-0.86, 0.86]) {
      const wheel = cylinder(g, x, 0.36, z, 0.3, 0.3, 0.2, 0x354850, 10);
      wheel.rotation.z = Math.PI / 2;
    }
  for (const x of [-0.46, 0.46]) {
    box(g, x, 0.66, 1.36, 0.27, 0.17, 0.035, 0xffeabb);
    box(g, x, 0.65, -1.36, 0.22, 0.16, 0.035, 0xd37764);
  }
  return g;
}
export function makeDriveableCar() {
  const g = new THREE.Group();
  g.name = "player-car";
  g.userData.wheels = [];

  // A broad, friendly SUV shape gives the player a generous visual target.
  // Exterior details sit just outside the shell to avoid z-fighting.
  box(g, 0, 0.62, 0, 1.82, 0.72, 3.45, 0x2f7780);
  box(g, 0, 1.1, -0.18, 1.5, 0.8, 1.86, 0x3f8990);
  box(g, 0, 1.55, -0.18, 1.42, 0.14, 1.78, 0xe7c56f);
  box(g, 0, 0.88, 1.81, 1.92, 0.2, 0.12, 0xf3d991);
  box(g, 0, 0.42, -1.81, 1.92, 0.2, 0.12, 0x245861);

  // Large windows and contrasting side steps make the cabin and entry side
  // easy to read at the game's follow-camera distance.
  box(g, 0, 1.18, 0.775, 1.22, 0.42, 0.035, 0xb9dfe0);
  box(g, 0, 1.18, -1.13, 1.22, 0.42, 0.035, 0xb9dfe0);
  for (const x of [-0.83, 0.83]) {
    box(g, x, 1.18, -0.16, 0.035, 0.42, 1.52, 0xb9dfe0);
    box(g, x * 1.04, 0.31, 0, 0.1, 0.1, 2.26, 0xf0c86c);
    box(g, x * 1.04, 0.91, 0.48, 0.08, 0.05, 0.24, 0x245861);
  }
  for (const x of [-0.93, 0.93])
    for (const z of [-1.12, 1.12]) {
      const wheel = cylinder(g, x, 0.38, z, 0.37, 0.37, 0.24, 0x263e45, 12);
      wheel.rotation.z = Math.PI / 2;
      g.userData.wheels.push(wheel);
    }
  for (const x of [-0.62, 0.62]) {
    box(g, x, 0.82, 1.77, 0.3, 0.2, 0.04, 0xfff0b4);
    box(g, x, 0.8, -1.77, 0.27, 0.18, 0.04, 0xd66d69);
  }
  for (const x of [-1.02, 1.02]) {
    box(g, x, 1.08, 0.82, 0.1, 0.2, 0.1, 0x245861);
    box(g, x, 1.08, -1.32, 0.1, 0.2, 0.1, 0x245861);
  }
  return g;
}
export function collider(area, mesh, x, z, w, d, height = 5) {
  area.colliders.push({
    minX: x - w / 2,
    maxX: x + w / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2,
    maxY: height,
  });
  area.cameraMeshes.push(mesh);
  return mesh;
}
export function makeBuilding(area, spec) {
  const {
    x,
    z,
    w = 9,
    d = 8,
    h = 5,
    color = 0xe2b58b,
    roof = 0x57857d,
    name = "HOUSE",
  } = spec;
  const g = area.group;
  const body = box(g, x, h / 2, z, w, h, d, color);
  collider(area, body, x, z, w, d, h + 2.3);
  const baseHeight = 0.4;
  const baseDepth = 0.18;
  const baseY = baseHeight / 2;
  // Keep the base outside the wall volume so the lower walls cannot z-fight.
  box(
    g,
    x,
    baseY,
    z + d / 2 + baseDepth / 2,
    w + baseDepth * 2,
    baseHeight,
    baseDepth,
    0xe9e4cc,
  );
  box(
    g,
    x,
    baseY,
    z - d / 2 - baseDepth / 2,
    w + baseDepth * 2,
    baseHeight,
    baseDepth,
    0xe9e4cc,
  );
  box(
    g,
    x - w / 2 - baseDepth / 2,
    baseY,
    z,
    baseDepth,
    baseHeight,
    d,
    0xe9e4cc,
  );
  box(
    g,
    x + w / 2 + baseDepth / 2,
    baseY,
    z,
    baseDepth,
    baseHeight,
    d,
    0xe9e4cc,
  );
  const roofMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0, 1, 2, 4),
    material(roof),
  );
  roofMesh.rotation.y = Math.PI / 4;
  roofMesh.scale.set((w + 1) / Math.sqrt(2), 1, (d + 1) / Math.sqrt(2));
  roofMesh.position.set(x, h + 0.9, z);
  roofMesh.castShadow = true;
  g.add(roofMesh);
  area.cameraMeshes.push(roofMesh);
  box(g, x, h - 0.05, z, w + 0.35, 0.22, d + 0.35, 0xffeacb);
  const front = z + d / 2;
  box(g, x, 1.25, front + 0.05, 1.3, 2.5, 0.15, 0x366768);
  box(g, x, 1.65, front + 0.14, 0.86, 1.15, 0.05, 0xa9d6d3);
  blob(g, x + 0.42, 1.05, front + 0.17, 0.065, 0xf1d579);
  for (const xx of [x - w * 0.32, x + w * 0.32]) {
    box(g, xx, 2, front + 0.055, 1.95, 2.05, 0.15, 0xffedcf);
    box(g, xx, 2.03, front + 0.15, 1.64, 1.7, 0.05, 0x8ec3c5);
    box(g, xx, 2.03, front + 0.2, 0.085, 1.7, 0.08, 0xffedcf);
    box(g, xx, 2.05, front + 0.2, 1.7, 0.085, 0.08, 0xffedcf);
    box(g, xx, 0.95, front + 0.23, 2.2, 0.17, 0.5, 0xffe6bd);
  }
  const awningColor = spec.awning ?? roof;
  for (let i = 0; i < 10; i++) {
    const aw = box(
      g,
      x - w * 0.46 + (i + 0.5) * w * 0.092,
      3.1,
      front + 0.65,
      w * 0.092,
      0.13,
      1.25,
      i % 2 ? 0xffefd3 : awningColor,
    );
    aw.rotation.x = 0.12;
  }
  label(g, name, x, 4.15, front + 0.15, w * 0.79);
  return { front, body };
}
