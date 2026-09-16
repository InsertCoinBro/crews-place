import * as THREE from "three";
import { box, cylinder, blob, label, material } from "./models.js";
import { SPACE_ALTITUDE as Y } from "./space.js";

export const PLAYGROUND = {
  entrance: [-32, 29],
  swing: [-45, 24],
  spinner: [-46, 44],
  slide: [-67, 9],
  float: [-65, -15],
};

export function slidePoint(t) {
  return new THREE.Vector3(
    -67 + Math.sin(t * Math.PI) * 5,
    Y + 22 * (1 - t) ** 2 + 0.5,
    9 + t * 42,
  );
}

function tube(parent, points, radius, color) {
  const curve = new THREE.CatmullRomCurve3(points);
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 80, radius, 8, false),
    material(color),
  );
  parent.add(mesh);
  return mesh;
}

export class SpacePlayground {
  constructor(game) {
    this.game = game;
    this.active = null;
    this.time = 0;
    this.speed = 0.6;
    this.floatVelocity = new THREE.Vector3();
    const area = game.areas.space;
    for (const mesh of [...area.group.children]) {
      if (
        mesh.name === "space-boundary-ridge" &&
        (mesh.position.x < -42 || mesh.position.z > 42)
      )
        area.group.remove(mesh);
    }
    area.bounds.minX = -83;
    area.bounds.maxZ = 64;
    const g = new THREE.Group();
    g.name = "space-playground";
    area.group.add(g);
    box(g, -65, -0.55, 11, 40, 1, 110, 0x777c96);
    box(g, -1, -0.55, 55, 90, 1, 22, 0x777c96);
    box(g, -48, 0.035, 29, 35, 0.06, 5, 0xabc9c5);
    box(g, -56, 0.04, 14, 4, 0.06, 58, 0xabc9c5);
    box(g, -60, 0.04, -4, 12, 0.06, 4, 0xabc9c5);
    box(g, -46, 0.04, 37, 4, 0.06, 15, 0xabc9c5);
    for (const [x, z] of [
      [-45, 24],
      [-46, 44],
      [-67, 9],
      [-65, -15],
    ]) {
      cylinder(g, x, 0.06, z, 8, 8, 0.1, 0x525e7e, 40);
    }
    label(
      g,
      "STARLIGHT PLAYGROUND · PLAY AT YOUR OWN PACE",
      -40,
      3.7,
      34,
      6,
      "#fff0c2",
      "#273957",
    ).rotation.y = Math.PI / 2;
    box(g, -40, 1.7, 36.6, 0.2, 3.4, 0.2, 0xf2d5a1);
    box(g, -40, 1.7, 31.4, 0.2, 3.4, 0.2, 0xf2d5a1);
    // Open paths connect the original moon surface to the new extension.
    for (let z = -21; z <= 61; z += 5) {
      blob(g, -81, 0.45, z, 0.45, 0xc0a8dc);
    }
    for (let x = -78; x <= -35; x += 5) blob(g, x, 0.45, 62, 0.45, 0xc0a8dc);

    const [sx, sz] = PLAYGROUND.swing;
    for (const dx of [-3, 3]) {
      box(g, sx + dx, 3.7, sz, 0.35, 7.4, 0.35, 0x83c8cf);
      area.colliders.push({
        minX: sx + dx - 0.25,
        maxX: sx + dx + 0.25,
        minZ: sz - 0.25,
        maxZ: sz + 0.25,
        minY: Y,
        maxY: Y + 7.4,
      });
    }
    box(g, sx, 7.3, sz, 6.7, 0.4, 0.4, 0x83c8cf);
    this.swing = new THREE.Group();
    this.swing.position.set(sx, 7.1, sz);
    g.add(this.swing);
    for (const dx of [-0.85, 0.85])
      box(this.swing, dx, -2.7, 0, 0.08, 5.4, 0.08, 0xf4d591);
    box(this.swing, 0, -5.4, 0, 2, 0.25, 1.6, 0xb5a0dc);
    box(this.swing, 0, -4.8, -0.65, 2, 1.2, 0.15, 0xb5a0dc);
    this.sign(g, "MOON SWING", sx + 7, sz + 3);
    this.register("swing", sx, sz + 2.5, "Ride the moon swing");

    const [rx, rz] = PLAYGROUND.spinner;
    this.spinner = new THREE.Group();
    this.spinner.position.set(rx, 0, rz);
    g.add(this.spinner);
    cylinder(this.spinner, 0, 0.35, 0, 4.2, 4.2, 0.6, 0x86bfc3, 48);
    cylinder(this.spinner, 0, 1, 0, 0.18, 0.18, 2, 0xf5d391);
    for (let n = 0; n < 6; n++) {
      const a = (n * Math.PI) / 3;
      box(
        this.spinner,
        Math.cos(a) * 2.8,
        0.7,
        Math.sin(a) * 2.8,
        0.8,
        0.7,
        0.8,
        0xc4a8d8,
      );
      tube(
        this.spinner,
        [
          new THREE.Vector3(0, 1.8, 0),
          new THREE.Vector3(Math.cos(a) * 2.8, 1.8, Math.sin(a) * 2.8),
        ],
        0.08,
        0xf5d391,
      );
    }
    this.sign(g, "ORBIT SPINNER", rx + 7, rz + 3);
    this.register("spinner", rx, rz + 5, "Ride the orbit spinner");

    // A 22-metre slide with a wide open trough, tall rails and a lift tower.
    const samples = Array.from({ length: 81 }, (_, i) =>
      slidePoint(i / 80).add(new THREE.Vector3(0, -Y, 0)),
    );
    for (let i = 0; i < 80; i++) {
      const a = samples[i],
        b = samples[i + 1];
      const piece = box(
        g,
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
        (a.z + b.z) / 2,
        3.8,
        0.2,
        a.distanceTo(b) + 0.1,
        0x91d2d0,
      );
      piece.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        b.clone().sub(a).normalize(),
      );
    }
    for (const side of [-1, 1])
      tube(
        g,
        samples.map((p) =>
          p.clone().add(new THREE.Vector3(side * 1.85, 0.75, 0)),
        ),
        0.22,
        0xe7bad4,
      );
    for (let i = 0; i < samples.length; i += 16) {
      const p = samples[i];
      for (const side of [-1, 1])
        box(g, p.x + side * 1.6, p.y / 2, p.z, 0.3, p.y, 0.3, 0x8999bf);
    }
    box(g, -67, 22, 7, 5, 0.35, 5, 0xbba4d8);
    for (const dx of [-2.4, 2.4])
      box(g, -67 + dx, 11, 7, 0.35, 22, 0.35, 0xbba4d8);
    this.lift = box(g, -67, 0.2, 6, 3.8, 0.35, 3.8, 0xf0cd85);
    cylinder(g, -67, 0.08, 54, 5, 5, 0.1, 0xe7bad4, 32);
    this.sign(g, "GIANT COMET SLIDE · 22 m", -67, 3);
    this.register("slide", -67, 4, "Take the lift to the giant slide");

    const [fx, fz] = PLAYGROUND.float;
    cylinder(g, fx, 0.1, fz, 10, 10, 0.15, 0x55798e, 64);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(10, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0x9fe3dc,
        transparent: true,
        opacity: 0.07,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    dome.position.set(fx, 0, fz);
    g.add(dome);
    for (const turn of [Math.PI / 4, (Math.PI * 3) / 4]) {
      const points = Array.from(
        { length: 41 },
        (_, i) =>
          new THREE.Vector3(
            fx + Math.cos((i * Math.PI) / 40) * 10 * Math.cos(turn),
            Math.sin((i * Math.PI) / 40) * 10,
            fz + Math.cos((i * Math.PI) / 40) * 10 * Math.sin(turn),
          ),
      );
      tube(g, points, 0.07, 0x9ddfd5);
    }
    for (let n = 0; n < 12; n++) {
      const a = (n * Math.PI) / 6;
      blob(
        g,
        fx + Math.cos(a) * 9.7,
        0.3,
        fz + Math.sin(a) * 9.7,
        0.17,
        0xf4dda7,
      );
    }
    this.sign(g, "ZERO-G GARDEN", fx + 9, fz + 10);
    for (let n = 0; n < 7; n++) {
      const angle = n * 2.399;
      const orb = blob(
        g,
        fx + Math.cos(angle) * 5,
        2 + n * 0.65,
        fz + Math.sin(angle) * 5,
        0.3,
        [0xf4dda7, 0xbba4d8, 0x9fe3dc][n % 3],
      );
      orb.name = "zero-g-floating-orb";
    }
    this.register("float", fx, fz + 10.5, "Enter the zero-gravity garden");
    // A quiet resting place is available alongside the rides.
    box(g, -35, 0.6, 43, 4, 0.3, 1.5, 0xb4cfc4);
    box(g, -35, 1.2, 43.7, 4, 1, 0.2, 0xb4cfc4);
    this.sign(g, "QUIET CORNER", -35, 46);

    this.panel = document.createElement("section");
    this.panel.className = "playground-controls";
    this.panel.setAttribute("role", "region");
    this.panel.setAttribute("aria-live", "polite");
    this.panel.setAttribute("aria-label", "Playground activity controls");
    this.panel.hidden = true;
    this.panel.innerHTML =
      '<strong id="playground-title"></strong><p id="playground-help"></p><div><button id="playground-slower">Slower</button><button id="playground-faster">Faster</button><button id="playground-up">Float up</button><button id="playground-down">Float down</button><button id="playground-exit">Exit ride · E</button></div>';
    document.querySelector("#game").append(this.panel);
    this.panel.querySelector("#playground-exit").onclick = () => this.exit();
    this.panel.querySelector("#playground-slower").onclick = () => {
      this.speed = Math.max(0.2, this.speed - 0.2);
    };
    this.panel.querySelector("#playground-faster").onclick = () => {
      this.speed = Math.min(1.2, this.speed + 0.2);
    };
    this.panel.querySelector("#playground-up").onclick = () => {
      this.floatVelocity.y = 2.5;
    };
    this.panel.querySelector("#playground-down").onclick = () => {
      this.floatVelocity.y = -2.5;
    };
    game.interactions.on("playground", (item) => this.enter(item.ride));
  }

  sign(g, text, x, z) {
    label(g, text, x, 2.4, z, 7, "#fff5d7", "#30435c");
  }
  register(ride, x, z, title) {
    this.game.interactions.register({
      id: `playground-${ride}`,
      area: "space",
      kind: "playground",
      ride,
      x,
      z,
      y: Y,
      radius: 3,
      label: title,
      hint: "Press E to play · You can leave at any time",
    });
  }
  enter(ride) {
    if (this.active || this.game.area.id !== "space") return;
    this.active = ride;
    this.time = 0;
    this.speed = 0.6;
    this.floatVelocity.set(0, 0, 0);
    this.savedPose = [];
    this.game.player.model.animator?.reset();
    this.game.player.model.rotation.set(0, 0, 0);
    this.game.player.model.updateMatrixWorld(true);
    if (ride === "swing" || ride === "slide")
      this.game.player.model.traverse((n) => {
        if (/DEF-thigh[LR]$|thigh[._-][LR]$/i.test(n.name)) {
          this.savedPose.push([n, n.quaternion.clone()]);
          this.bendJoint(n, -Math.PI / 2);
        }
        if (/DEF-shin[LR]$|shin[._-][LR]$/i.test(n.name)) {
          this.savedPose.push([n, n.quaternion.clone()]);
          this.bendJoint(n, Math.PI / 2);
        }
      });
    this.game.input.clear();
    this.game.player.velocity.set(0, 0);
    this.panel.hidden = false;
    this.panel.querySelector("#playground-title").textContent = {
      swing: "Moon swing",
      spinner: "Orbit spinner",
      slide: "Giant comet slide",
      float: "Zero-gravity garden",
    }[ride];
    this.panel.querySelector("#playground-help").textContent =
      ride === "float"
        ? "WASD to drift · Space to rise · C to descend · E to return to the entrance"
        : ride === "slide"
          ? "The lift carries you up, then down the giant slide! E exits safely at any time."
          : "Enjoy the ride. Choose Slower or Faster. Press E to step off safely.";
    for (const id of ["up", "down"])
      this.panel.querySelector(`#playground-${id}`).hidden = ride !== "float";
    for (const id of ["slower", "faster"])
      this.panel.querySelector(`#playground-${id}`).hidden = ride === "float";
    if (ride === "float") this.game.player.position.set(-65, Y + 2, -15);
    this.game.ui.showPrompt(null);
  }
  exit() {
    if (!this.active) return;
    const ride = this.active;
    const exits = {
      swing: [-45, 29],
      spinner: [-46, 50],
      slide: [-67, 56],
      float: [-65, -3],
    };
    for (const [node, pose] of this.savedPose ?? []) node.quaternion.copy(pose);
    this.game.player.model.rotation.z = 0;
    this.game.player.teleport(...exits[ride], Y);
    this.active = null;
    this.swing.rotation.x = 0;
    this.lift.position.y = 0.2;
    this.panel.hidden = true;
    this.game.input.clear();
    this.game.interactionCooldown = 0.5;
    this.game.follow.ready = false;
    this.game.canvas.focus();
  }
  bendJoint(node, angle) {
    // Bones have different bind orientations in the two avatars. Bend in the
    // character's forward plane instead of overwriting their local axes.
    const world = node.getWorldQuaternion(new THREE.Quaternion());
    const delta = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      angle,
    );
    node.quaternion.copy(
      node.parent
        .getWorldQuaternion(new THREE.Quaternion())
        .invert()
        .multiply(delta)
        .multiply(world),
    );
    node.updateMatrixWorld(true);
  }
  update(dt) {
    const game = this.game,
      p = game.player;
    if (game.input.consume("KeyE")) {
      this.exit();
      return;
    }
    this.time += dt * this.speed * (game.calm ? 0.55 : 1);
    if (this.active === "swing") {
      const angle = Math.sin(this.time * 1.2) * (game.calm ? 0.25 : 0.65);
      this.swing.rotation.x = angle;
      p.position.set(
        -45,
        Y + 7.1 - 5.4 * Math.cos(angle) - 0.5,
        24 - 5.4 * Math.sin(angle),
      );
      p.heading = 0;
    } else if (this.active === "spinner") {
      this.spinner.rotation.y = this.time * 0.7;
      p.position.set(
        -46 + Math.cos(this.spinner.rotation.y) * 2,
        Y + 0.66,
        44 - Math.sin(this.spinner.rotation.y) * 2,
      );
      p.heading = this.spinner.rotation.y;
    } else if (this.active === "slide") {
      if (this.time < 4) {
        this.lift.position.y = 0.2 + 22 * Math.min(1, this.time / 4);
        p.position.set(-67, Y + this.lift.position.y - 0.5, 6);
      } else {
        const t = Math.min(1, (this.time - 4) / 7);
        p.position.copy(slidePoint(t));
        p.position.y -= 0.5;
        p.heading = Math.atan2(Math.PI * 5 * Math.cos(t * Math.PI), 42);
        if (t === 1) {
          this.exit();
          return;
        }
      }
    } else if (this.active === "float") {
      const side =
        Number(game.input.down("KeyD", "ArrowRight")) -
        Number(game.input.down("KeyA", "ArrowLeft"));
      const forward =
        Number(game.input.down("KeyW", "ArrowUp")) -
        Number(game.input.down("KeyS", "ArrowDown"));
      const up =
        Number(game.input.down("Space")) - Number(game.input.down("KeyC"));
      const yaw = game.follow.yaw;
      this.floatVelocity.addScaledVector(
        new THREE.Vector3(
          side * Math.cos(yaw) - forward * Math.sin(yaw),
          up,
          -side * Math.sin(yaw) - forward * Math.cos(yaw),
        ),
        dt * 3,
      );
      this.floatVelocity
        .multiplyScalar(Math.exp(-dt * 0.6))
        .clampLength(0, game.calm ? 2 : 3.5);
      p.position.addScaledVector(this.floatVelocity, dt);
      const offset = p.position.clone().sub(new THREE.Vector3(-65, Y, -15));
      offset.y = Math.max(1, offset.y);
      if (offset.length() > 8.5) {
        offset.setLength(8.5);
        this.floatVelocity.multiplyScalar(0.3);
      }
      p.position.copy(offset.add(new THREE.Vector3(-65, Y, -15)));
    }
    p.sync();
    p.model.visible = true;
  }
}
