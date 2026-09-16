import * as THREE from "three";
import { CoasterRide } from "./coaster-track.js";
import { SPACE_ALTITUDE } from "./space.js";

export const SPACE_DIVE_STATION = Object.freeze({ x: 59, z: -118 });
export const SPACE_DIVE_EXIT = Object.freeze({ x: 59, z: -114.6 });
export const SPACE_DIVE_COLORS = [
  0x31dbe8, 0x75f2ff, 0x7970ed, 0xad8af2, 0xe6f5ff, 0x61a4ff,
];

export function createSpaceDiveTrack() {
  const top = SPACE_ALTITUDE;
  const nodes = [
    [59, 1, -118],
    [67, 1, -118],
    [74, 8, -105],
    [78, 40, -89],
    [80, 100, -60],
    [80, top - 12, -26],
    [70, top + 29, 10],
    [48, top + 40, 35],
    [20, top + 42, 51],
    [-4, top + 40, 40],
    [-4, top + 35, 2],
    [-4, top + 24, -40],
    [25, 140, -85],
    [39, 40, -115],
    [39, 8, -135],
    [27, 1.8, -147],
    [18, 1, -133],
    [32, 1, -118],
  ];
  const curve = new THREE.CatmullRomCurve3(
    nodes.map((p) => new THREE.Vector3(...p)),
    true,
    "centripetal",
  );
  curve.arcLengthDivisions = 12000;
  const length = curve.getLength(),
    count = 3600;
  const points = [],
    tangents = [],
    rights = [],
    ups = [],
    rotations = [];
  let panoramaStart = 0,
    panoramaEnd = 0;
  for (let i = 0; i <= count; i++) {
    const u = i / count,
      node = curve.getUtoTmapping(u) * nodes.length;
    if (node < 6.6) panoramaStart = u * length;
    if (node < 10.2) panoramaEnd = u * length;
    const tangent = curve.getTangentAt(u).normalize();
    const right = new THREE.Vector3()
      .crossVectors(new THREE.Vector3(0, 1, 0), tangent)
      .normalize();
    const up = new THREE.Vector3().crossVectors(tangent, right).normalize();
    points.push(curve.getPointAt(u));
    tangents.push(tangent);
    rights.push(right);
    ups.push(up);
    rotations.push(
      new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(right, up, tangent),
      ),
    );
  }
  const sample = (distance) => {
    const f =
      (THREE.MathUtils.euclideanModulo(distance, length) / length) * count;
    const i = Math.floor(f),
      a = f - i;
    const rotation = rotations[i].clone().slerp(rotations[i + 1], a);
    return {
      position: points[i].clone().lerp(points[i + 1], a),
      rotation,
      tangent: new THREE.Vector3(0, 0, 1).applyQuaternion(rotation),
      right: new THREE.Vector3(1, 0, 0).applyQuaternion(rotation),
      up: new THREE.Vector3(0, 1, 0).applyQuaternion(rotation),
    };
  };
  return {
    curve,
    length,
    count,
    points,
    tangents,
    rights,
    ups,
    rotations,
    sample,
    panoramaStart,
    panoramaEnd,
  };
}

export class SpaceDiveRide extends CoasterRide {
  update(dt) {
    if (this.state !== "riding") return;
    for (let left = Math.min(Math.max(dt, 0), 0.1); left > 1e-8; ) {
      const h = Math.min(left, 1 / 120);
      left -= h;
      this.elapsed += h;
      const remain = this.track.length - this.distance;
      const s = this.track.sample(this.distance);
      if (remain < 80) {
        this.phase = "Magnetic brakes · arriving home";
        const target = Math.min(
          35,
          Math.sqrt(Math.max(0, 2 * 8 * (remain - 0.06))),
        );
        this.speed = THREE.MathUtils.damp(this.speed, target, 5, h);
      } else if (this.distance < 15) {
        this.phase = "Leaving the launch station";
        this.speed = Math.min(7, this.speed + 3 * h);
      } else if (this.distance < this.track.panoramaStart) {
        this.phase =
          s.position.y < 100 ? "Climbing above the clouds" : "Entering space";
        const target = THREE.MathUtils.lerp(
          8,
          17,
          THREE.MathUtils.smoothstep(
            this.track.panoramaStart - this.distance,
            0,
            45,
          ),
        );
        this.speed = THREE.MathUtils.damp(this.speed, target, 1.8, h);
      } else if (this.distance < this.track.panoramaEnd) {
        this.phase = "Space flyby · enjoy the view";
        this.speed = THREE.MathUtils.damp(this.speed, 9, 2, h);
      } else {
        this.phase = "SPACE DIVE!";
        this.speed = THREE.MathUtils.clamp(
          this.speed + (8 - 17 * s.tangent.y) * h,
          9,
          66,
        );
      }
      this.distance += this.speed * h;
      if (remain < 0.13 || this.distance >= this.track.length) {
        this.distance = 0;
        this.speed = 0;
        this.state = "arrived";
        this.phase = "Welcome back to Earth!";
        break;
      }
    }
  }
}
