import * as THREE from "three";
import { RACE_COLORS, meteorState } from "./space-race-track.js";

const metal = (color, roughness = 0.32) =>
  new THREE.MeshStandardMaterial({
    color,
    metalness: 0.72,
    roughness,
    fog: false,
  });
const light = (color, opacity = 1) =>
  new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity === 1,
    fog: false,
  });
const add = (parent, geometry, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const block = (parent, size, mat, x, y, z) =>
  add(parent, new THREE.BoxGeometry(...size), mat, x, y, z);

// A small shared, soft-edged flame texture avoids dozens of particle emitters
// and does not require an external asset or a browser canvas during tests.
function flameMaterial() {
  const width = 32,
    height = 64,
    pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const v = y / (height - 1),
        u = (x / (width - 1)) * 2 - 1;
      const curl = Math.sin(v * 10) * v * 0.2;
      const edge = Math.max(
        0,
        1 - Math.abs(u - curl) / Math.max(0.03, (1 - v) * 0.8),
      );
      const heat = edge * (1 - v),
        i = (y * width + x) * 4;
      pixels[i] = 255;
      pixels[i + 1] = 65 + heat * 185;
      pixels[i + 2] = 8 + Math.pow(heat, 3) * 170;
      pixels[i + 3] = Math.pow(edge, 0.8) * Math.min(1, v * 15) * (1 - v) * 255;
    }
  const map = new THREE.DataTexture(pixels, width, height);
  map.magFilter = map.minFilter = THREE.LinearFilter;
  map.needsUpdate = true;
  return new THREE.MeshBasicMaterial({
    map,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
}

export function createRaceShip(color) {
  const ship = new THREE.Group();
  ship.name = "plasma-racing-spacecraft";
  const paint = metal(color),
    alloy = metal(0xbdcedc),
    carbon = metal(0x101b2c),
    glow = light(color);
  const hull = add(
    ship,
    new THREE.SphereGeometry(1, 24, 12),
    paint,
    0,
    0.56,
    0,
  );
  hull.scale.set(1.45, 0.53, 3.05);
  const belly = add(
    ship,
    new THREE.SphereGeometry(1, 20, 10),
    carbon,
    0,
    0.28,
    -0.15,
  );
  belly.scale.set(1.5, 0.24, 2.6);
  for (const side of [-1, 1]) {
    const pod = add(
      ship,
      new THREE.CylinderGeometry(0.56, 0.63, 3.4, 16),
      alloy,
      side * 1.6,
      0.5,
      -0.7,
    );
    pod.rotation.x = Math.PI / 2;
    block(ship, [0.13, 0.1, 3.5], glow, side * 1.65, 1.09, -0.25);
    const wing = block(ship, [1.2, 0.16, 2.4], paint, side * 1.55, 0.72, 0.55);
    wing.rotation.y = side * 0.28;
    const fin = block(
      ship,
      [0.12, 0.95, 1.35],
      carbon,
      side * 1.75,
      1.05,
      -1.75,
    );
    fin.rotation.z = -side * 0.25;
    const nozzle = add(
      ship,
      new THREE.TorusGeometry(0.43, 0.12, 8, 20),
      carbon,
      side * 1.6,
      0.5,
      -2.48,
    );
    add(
      ship,
      new THREE.TorusGeometry(0.34, 0.055, 6, 20),
      glow,
      side * 1.6,
      0.5,
      -2.62,
    );
    for (let j = 0; j < 4; j++)
      block(
        ship,
        [0.32, 0.05, 0.07],
        carbon,
        side * 1.5,
        1.08,
        -0.4 + j * 0.24,
      );
    nozzle.name = "titanium-engine-nozzle";
  }
  block(ship, [1.05, 0.2, 1.15], carbon, 0, 0.84, -0.6);
  block(ship, [1, 1.1, 0.18], carbon, 0, 1.35, -1.05);
  block(ship, [1.1, 0.18, 0.45], alloy, 0, 1.1, 0.72);
  block(ship, [0.6, 0.025, 0.25], glow, 0, 1.21, 0.7);
  const canopy = add(
    ship,
    new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: 0xaeeaff,
      metalness: 0.1,
      roughness: 0.05,
      transparent: true,
      opacity: 0.17,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    }),
    0,
    0.92,
    -0.15,
  );
  canopy.scale.set(1.13, 2.5, 1.87);
  canopy.name = "racer-glass-canopy";
  const rim = add(
    ship,
    new THREE.TorusGeometry(1, 0.055, 6, 36),
    alloy,
    0,
    0.93,
    -0.15,
  );
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1.13, 1.87, 1);
  const flames = new THREE.Group();
  flames.name = "plasma-engine-fire";
  ship.add(flames);
  for (const side of [-1, 1])
    for (const core of [false, true]) {
      const jet = add(
        flames,
        new THREE.ConeGeometry(core ? 0.23 : 0.42, core ? 2.5 : 4.5, 12),
        light(core ? 0xeaffff : 0x25acff, core ? 0.9 : 0.7),
        side * 1.6,
        0.5,
        core ? -3.6 : -4.6,
      );
      jet.rotation.x = -Math.PI / 2;
    }
  ship.userData.flames = flames;
  flames.visible = false;
  const shield = add(
    ship,
    new THREE.SphereGeometry(1, 20, 12),
    light(0x65dcff, 0.14),
    0,
    1.2,
    0,
  );
  shield.scale.set(2.55, 2.6, 3.65);
  shield.visible = false;
  shield.name = "racer-energy-shield";
  ship.userData.shield = shield;
  return ship;
}

function anchor(parent, track, distance, lane = 0, name = "") {
  const group = new THREE.Group(),
    s = track.sample(distance, lane);
  group.position.copy(s.position);
  group.rotation.y = s.heading;
  group.name = name;
  group.userData.distance = distance;
  parent.add(group);
  return group;
}

export class RaceEffects {
  constructor(parent, track) {
    this.track = track;
    this.dynamic = [];
    this.tunnels = [];
    const cyan = light(0x00eeff),
      amber = light(0xff9c16),
      dark = metal(0x111c2b);
    for (const [features, stop] of [
      [track.boosts, false],
      [track.brakes, true],
    ]) {
      for (const f of features) {
        const pad = anchor(
          parent,
          track,
          f.distance,
          f.lane,
          stop ? "magnetic-stopper" : "plasma-boost-zone",
        );
        block(pad, [4.8, 0.12, 12], dark, 0, 0.05, 0);
        for (const side of [-1, 1])
          block(
            pad,
            [0.12, 0.15, 12],
            stop ? amber : cyan,
            side * 2.35,
            0.12,
            0,
          );
        for (let j = -2; j <= 2; j++) {
          if (stop) {
            const strip = block(pad, [3.7, 0.1, 0.45], amber, 0, 0.15, j * 1.9);
            strip.rotation.y = -0.22;
          } else {
            for (const side of [-1, 1]) {
              const chevron = block(
                pad,
                [2.3, 0.09, 0.42],
                cyan,
                side * 0.84,
                0.14,
                j * 2,
              );
              chevron.rotation.y = side * 0.55;
            }
          }
        }
        if (stop)
          for (const side of [-1, 1]) {
            block(pad, [0.38, 1.4, 1.5], metal(0x7c3511), side * 2.6, 0.7, 0);
            block(pad, [0.13, 1, 1], amber, side * 2.6, 0.8, 0);
          }
      }
    }
    const flame = flameMaterial();
    for (const ring of track.rings) {
      const g = anchor(parent, track, ring.distance, 0, "flaming-jump-ring");
      const s = track.sample(ring.distance);
      g.position.y += s.lift + 2;
      g.rotation.order = "YXZ";
      g.rotation.x = -s.pitch;
      add(g, new THREE.TorusGeometry(12, 0.22, 8, 48), metal(0x51301f));
      add(g, new THREE.TorusGeometry(11.82, 0.15, 6, 48), light(0xffbd28));
      const fire = new THREE.InstancedMesh(
        new THREE.PlaneGeometry(2.5, 5),
        flame,
        32,
      );
      const core = new THREE.InstancedMesh(
        new THREE.PlaneGeometry(1.4, 3.6),
        flame,
        32,
      );
      const dummy = new THREE.Object3D();
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * Math.PI * 2;
        dummy.position.set(Math.cos(a) * 12, Math.sin(a) * 12 + 1.6, 0);
        dummy.rotation.z = -Math.cos(a) * 0.45;
        dummy.scale.setScalar(0.8 + (i % 4) * 0.12);
        dummy.updateMatrix();
        fire.setMatrixAt(i, dummy.matrix);
        core.setMatrixAt(i, dummy.matrix);
      }
      g.add(fire, core);
      this.dynamic.push({ kind: "ring", group: g, fire });
    }
    for (const [i, p] of track.pickups.entries()) {
      const g = anchor(parent, track, p.distance, p.lane, "powerup-" + p.type);
      const color = { turbo: 0x00edff, shield: 0x5e95ff, pulse: 0xd980ff }[
        p.type
      ];
      const gem = add(
        g,
        new THREE.OctahedronGeometry(1.2),
        metal(color),
        0,
        2.2,
        0,
      );
      const halo = add(
        g,
        new THREE.TorusGeometry(1.75, 0.075, 6, 24),
        light(color),
        0,
        2.2,
        0,
      );
      halo.rotation.x = Math.PI / 2;
      // Each capsule has a distinct silhouette as well as its color.
      if (p.type === "turbo")
        block(g, [0.2, 1.1, 0.2], light(0xffffff), 0, 3.8, 0);
      if (p.type === "shield")
        add(
          g,
          new THREE.SphereGeometry(1.45, 12, 8),
          light(color, 0.15),
          0,
          2.2,
          0,
        );
      this.dynamic.push({ kind: "pickup", index: i, group: g, gem });
    }
    for (const meteor of track.meteors) {
      const g = anchor(
        parent,
        track,
        meteor.distance,
        meteor.lane,
        "meteor-warning-zone",
      );
      const warning = add(
        g,
        new THREE.RingGeometry(2.6, 3.2, 32),
        light(0xffa938, 0.65),
        0,
        0.1,
        0,
      );
      warning.rotation.x = -Math.PI / 2;
      const impact = add(
        g,
        new THREE.RingGeometry(0.5, 4, 32),
        light(0xff7132, 0.38),
        0,
        0.13,
        0,
      );
      impact.rotation.x = -Math.PI / 2;
      const rocks = [];
      for (let i = 0; i < 3; i++) {
        const comet = new THREE.Group();
        g.add(comet);
        add(
          comet,
          new THREE.DodecahedronGeometry(i ? 0.55 : 1.1, 1),
          metal(0x492c24, 0.95),
        );
        const flame = add(
          comet,
          new THREE.ConeGeometry(i ? 0.45 : 0.9, i ? 5 : 9, 8),
          light(0xff671c, 0.75),
          0,
          i ? 2.5 : 4.5,
          0,
        );
        flame.rotation.z = -0.22;
        add(
          comet,
          new THREE.SphereGeometry(i ? 0.3 : 0.7, 8, 6),
          light(0xffd45a),
        );
        rocks.push(comet);
      }
      this.dynamic.push({
        kind: "meteor",
        group: g,
        warning,
        impact,
        rocks,
        meteor,
      });
    }
    for (const [index, tunnel] of track.tunnels.entries())
      this.buildTunnel(parent, tunnel, index);
  }
  buildTunnel(parent, tunnel, index) {
    const group = new THREE.Group();
    group.name = "orbital-race-tunnel";
    parent.add(group);
    const vertices = [],
      indices = [],
      segments = 24,
      arcs = 16;
    for (let i = 0; i <= segments; i++) {
      const s = this.track.sample(
        tunnel.start + (tunnel.length * i) / segments,
      );
      for (let j = 0; j <= arcs; j++) {
        const a = (j / arcs) * Math.PI;
        const p = s.position
          .clone()
          .addScaledVector(s.right, Math.cos(a) * 12.5);
        p.y += Math.sin(a) * 12;
        vertices.push(p.x, p.y, p.z);
        if (i < segments && j < arcs) {
          const n = i * (arcs + 1) + j;
          // Breaks in the shell make skylights while keeping continuous ribs.
          if (i % 6 < 4)
            indices.push(
              n,
              n + arcs + 1,
              n + 1,
              n + 1,
              n + arcs + 1,
              n + arcs + 2,
            );
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const shell = metal(0x192739, 0.48);
    shell.side = THREE.DoubleSide;
    add(group, geometry, shell);
    for (let i = 0; i <= 8; i++) {
      const s = this.track.sample(tunnel.start + (tunnel.length * i) / 8);
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(12, 0.13, 6, 32, Math.PI),
        light(RACE_COLORS[index]),
      );
      rib.position.copy(s.position);
      rib.rotation.y = s.heading;
      group.add(rib);
    }
    group.userData.center = this.track.sample(
      tunnel.start + tunnel.length / 2,
    ).position;
    this.tunnels.push(group);
  }
  update(run, player, groundY, gentle, occupied) {
    const localX = player.x,
      localZ = player.z;
    const lap = Math.min(
      1,
      Math.floor(run.racers[0].distance / this.track.length),
    );
    for (const item of this.dynamic) {
      const g = item.group;
      g.visible =
        Math.hypot(g.position.x - localX, g.position.z - localZ) < 380;
      if (!g.visible) continue;
      if (item.kind === "ring") {
        const scale = gentle
          ? 1
          : 1 + Math.sin(run.elapsed * 5 + g.userData.distance) * 0.035;
        item.fire.scale.set(1, scale, 1);
      } else if (item.kind === "pickup") {
        g.visible =
          !occupied || !run.racers[0].collected.has(`${lap}:${item.index}`);
        item.gem.rotation.y = run.elapsed * 0.9;
      } else {
        const s = meteorState(item.meteor, run.elapsed);
        item.warning.visible = occupied && s.warning;
        item.impact.visible = occupied && s.impact;
        for (let i = 0; i < item.rocks.length; i++) {
          const rock = item.rocks[i];
          rock.visible = occupied && s.falling;
          const height = (1 - s.fall) * (gentle ? 42 : 70);
          rock.position.set(
            (i ? (i === 1 ? -22 : 22) : 0) - height * 0.22,
            height + (i ? 6 : 1),
            i ? i * 7 : 0,
          );
          rock.rotation.y = run.elapsed * 1.2;
        }
      }
    }
    for (const tunnel of this.tunnels)
      tunnel.visible =
        Math.hypot(
          tunnel.userData.center.x - localX,
          tunnel.userData.center.z - localZ,
        ) < 520;
  }
}
