import * as THREE from "three";

export const TUBE_ENTRY = Object.freeze({ x: 160, z: 35 });
export const TUBE_EXIT = Object.freeze({ x: 145, z: 54 });
export const TUBE_RADIUS = 2.8;
export const TUBE_DURATION = 60;

// Coordinates are local to the elevated space area. Transported frames keep
// the belly-down rider continuous through vertical tangents and inversions.
export function createSpaceTubeTrack() {
  const nodes = [
    [160, 2.8, 35],
    [174, 2.8, 35],
    [190, 8, 35],
    [218, 30, 20],
    [270, 36, -38],
  ];
  for (let i = 0; i <= 64; i++) {
    const t = i / 64,
      a = t * Math.PI * 4;
    nodes.push([250 + 35 * Math.cos(a), 42 + 260 * t, -20 + 35 * Math.sin(a)]);
  }
  nodes.push(
    [300, 315, 16],
    [332, 300, 45],
    [365, 238, 65],
    [365, 145, 65],
    [365, 95, 65],
  );
  const loop = (x, y, z, r, drift) => {
    for (let i = 1; i <= 48; i++) {
      const t = i / 48,
        a = t * Math.PI * 2;
      nodes.push([
        x + r * Math.sin(a),
        y + r * (1 - Math.cos(a)),
        z + drift * t,
      ]);
    }
  };
  loop(365, 95, 65, 48, 30);
  nodes.push([423, 98, 101], [455, 105, 110]);
  loop(455, 105, 110, 36, 35);
  nodes.push([495, 135, 148], [524, 154, 159]);
  for (let i = 0; i <= 72; i++) {
    const t = i / 72,
      a = t * Math.PI * 6;
    nodes.push([500 + 25 * Math.cos(a), 160 + 25 * Math.sin(a), 165 + 150 * t]);
  }
  nodes.push(
    [554, 190, 349],
    [608, 215, 367],
    [665, 110, 310],
    [650, 65, 210],
    [583, 109, 189],
    [560, 60, 80],
    [440, 35, -55],
    [320, 20, -100],
    [220, 12, -85],
    [160, 6, -30],
    [150, 3, 15],
    [150, 2.8, 42],
    [150, 2.8, 53],
  );
  const guide = new THREE.CatmullRomCurve3(
    nodes.map((p) => new THREE.Vector3(...p)),
    false,
    "centripetal",
  );
  guide.arcLengthDivisions = 18000;
  let smoothed = guide.getSpacedPoints(Math.ceil(guide.getLength() / 4));
  for (let pass = 0; pass < 3; pass++)
    smoothed = smoothed.map((p, i) =>
      i === 0 || i === smoothed.length - 1
        ? p
        : p
            .clone()
            .multiplyScalar(0.5)
            .addScaledVector(smoothed[i - 1], 0.25)
            .addScaledVector(smoothed[i + 1], 0.25),
    );
  for (const p of smoothed) p.y = Math.max(2.8, p.y);
  const curve = new THREE.CatmullRomCurve3(smoothed, false, "centripetal");
  curve.arcLengthDivisions = 18000;
  const length = curve.getLength(),
    count = 4000,
    frames = curve.computeFrenetFrames(count, false);
  const points = curve.getSpacedPoints(count),
    rotations = [];
  // The first transported normal is arbitrary. Align local up with world up.
  const startRight = new THREE.Vector3(0, 1, 0)
    .cross(frames.tangents[0])
    .normalize();
  const angle = Math.atan2(
    frames.tangents[0].dot(frames.normals[0].clone().cross(startRight)),
    frames.normals[0].dot(startRight),
  );
  const rights = [],
    ups = [];
  for (let i = 0; i <= count; i++) {
    const tangent = frames.tangents[i];
    const right = frames.normals[i].clone().applyAxisAngle(tangent, angle);
    const up = new THREE.Vector3().crossVectors(tangent, right).normalize();
    rights.push(right);
    ups.push(up);
    rotations.push(
      new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(right, up, tangent),
      ),
    );
  }
  const sample = (distance) => {
    const f = THREE.MathUtils.clamp(distance / length, 0, 1) * count,
      i = Math.min(count - 1, Math.floor(f)),
      a = f - i;
    const rotation = rotations[i].clone().slerp(rotations[i + 1], a);
    return {
      position: points[i].clone().lerp(points[i + 1], a),
      rotation,
      tangent: new THREE.Vector3(0, 0, 1).applyQuaternion(rotation),
      up: new THREE.Vector3(0, 1, 0).applyQuaternion(rotation),
      right: new THREE.Vector3(1, 0, 0).applyQuaternion(rotation),
    };
  };
  return { curve, length, count, points, rotations, rights, ups, sample };
}

// Fixed ride time with smooth acceleration and a long, visible braking zone.
// Calm mode slows time rather than skipping any of the course.
export class SpaceTubeRide {
  constructor(track) {
    this.track = track;
    this.reset();
  }
  reset() {
    this.elapsed = 0;
    this.distance = 0;
    this.speed = 0;
    this.state = "waiting";
  }
  launch() {
    if (this.state !== "waiting") return false;
    this.state = "riding";
    return true;
  }
  update(dt, calm = false) {
    if (this.state !== "riding") return;
    this.elapsed = Math.min(
      TUBE_DURATION,
      this.elapsed + Math.min(0.1, Math.max(0, dt)) * (calm ? 0.7 : 1),
    );
    const t = this.elapsed;
    // Integral of a 4s smooth acceleration, constant flow, 8s smooth brake.
    const ramp = (x) => x * x * x - (x * x * x * x) / 2;
    const travelled =
      t < 4
        ? 4 * ramp(t / 4)
        : t < 52
          ? t - 2
          : 50 + 8 * ((t - 52) / 8 - ramp((t - 52) / 8));
    const gain =
      t < 4
        ? THREE.MathUtils.smoothstep(t, 0, 4)
        : t < 52
          ? 1
          : 1 - THREE.MathUtils.smoothstep(t, 52, 60);
    this.distance = (this.track.length * travelled) / 54;
    this.speed = (this.track.length / 54) * gain * (calm ? 0.7 : 1);
    if (t >= TUBE_DURATION) {
      this.distance = this.track.length;
      this.speed = 0;
      this.state = "arrived";
    }
  }
}
