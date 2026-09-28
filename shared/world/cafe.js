import * as THREE from "three";
import { createArea, BUILDINGS } from "./town.js";
import { box, collider, label } from "./models.js";
import { SHIP_EXIT } from "./spaceship.js";

export function buildCafe(scene, interactions, origin = 190) {
  const portalZ = -3;
  const area = createArea(
    "cafe",
    "Sunny Side Café",
    {
      minX: origin - 7,
      maxX: origin + 7,
      minZ: -13,
      maxZ: 9,
    },
    true,
  );
  area.spawn = [origin, 3.5];
  area.portalReturnSpawn = [origin, portalZ + 2];
  area.cameraView = { targetHeight: 2, distance: 5 };
  area.environment = {
    background: 0x000000,
    fog: 0x000000,
    exposure: 1,
    environmentIntensity: 0,
    skyIntensity: 0,
    sunIntensity: 0,
  };
  scene.add(area.group);
  area.group.visible = false;
  const black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  for (const [x, y, z, w, h, d] of [
    [origin, -0.12, -2, 14, 0.2, 22],
    [origin, 2.5, -13, 14, 5, 0.3],
    [origin - 7, 2.5, -2, 0.3, 5, 22],
    [origin + 7, 2.5, -2, 0.3, 5, 22],
    [origin, 2.5, 9, 14, 5, 0.3],
  ]) {
    const mesh = box(area.group, x, y, z, w, h, d, 0x000000);
    mesh.material = black;
    if (y > 0) collider(area, mesh, x, z, w, d, 5);
  }
  // A readable way out remains available even with all room lighting off.
  label(area.group, "EXIT", origin, 2.5, 8.8, 1.2);
  const exterior = BUILDINGS.find((building) => building.id === "cafe");
  interactions.register({
    id: "cafe-exit",
    area: "cafe",
    kind: "door",
    target: "town",
    spawn: [exterior.x, exterior.z + exterior.d / 2 + 2.3],
    x: origin,
    z: 7.8,
    radius: 1.4,
    label: "Return to town",
    hint: "Leave Sunny Side Café",
  });
  const material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec2 vUv; uniform float time;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float r = length(p);
        float a = atan(p.y, p.x);
        float swirl = 0.5 + 0.5 * sin(a * 4.0 + r * 17.0 - time * 1.4);
        vec3 color = mix(vec3(0.015, 0.22, 1.0), vec3(0.02, 1.0, 0.25), swirl);
        float rim = exp(-pow((r - 0.87) * 25.0, 2.0));
        float glow = 0.3 + 0.5 * swirl + 0.5 * rim;
        float alpha = 1.0 - smoothstep(0.90, 1.0, r);
        gl_FragColor = vec4(color * glow, alpha);
      }`,
  });
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.2), material);
  portal.name = "cafe-space-portal";
  portal.position.set(origin, 2.1, portalZ);
  area.group.add(portal);
  interactions.register({
    id: "cafe-space-portal",
    area: "cafe",
    kind: "cafePortal",
    x: origin,
    z: portalZ,
    radius: 2.7,
    label: "Enter the Space portal",
    hint: "Walk into the swirl or press E",
  });
  area.updatePortal = (dt, calm) => {
    material.uniforms.time.value += dt * (calm ? 0.25 : 1);
  };
  area.containsPortal = (position) =>
    Math.abs(position.x - origin) < 1.15 &&
    Math.abs(position.z - portalZ) < 0.65 &&
    position.y >= 0 &&
    position.y < 3.5;
  return area;
}

export function buildSpaceCafePortal(cafe, space, interactions) {
  // Stay at the spacecraft dock so the return route remains in a predictable place.
  const x = SHIP_EXIT.x;
  const z = SHIP_EXIT.z + 5;
  const portal = cafe.group.getObjectByName("cafe-space-portal").clone();
  portal.material = portal.material.clone();
  portal.name = "space-cafe-portal";
  portal.position.set(x, 2.1, z);
  space.group.add(portal);
  label(space.group, "SUNNY SIDE CAFÉ", x, 4.7, z, 3.4);
  interactions.register({
    id: "space-cafe-portal",
    area: "space",
    kind: "cafePortal",
    x,
    y: space.groundY,
    z,
    radius: 2.7,
    label: "Return to Sunny Side Café",
    hint: "Walk into the swirl or press E",
  });
  space.updatePortal = (dt, calm) => {
    portal.material.uniforms.time.value += dt * (calm ? 0.25 : 1);
  };
  space.containsPortal = (position) =>
    Math.abs(position.x - x) < 1.15 &&
    Math.abs(position.z - z) < 0.65 &&
    position.y >= space.groundY &&
    position.y < space.groundY + 3.5;
}
