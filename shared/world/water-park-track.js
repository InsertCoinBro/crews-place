import * as THREE from "three";

export const WATER_PARK_EXIT = Object.freeze({ x: -151, z: -62 });
export const WATER_PARK_BOUNDS = Object.freeze({
  minX: -242,
  maxX: -94,
  minZ: -333,
  maxZ: -52,
});
export const WATER_COLORS = [
  0xff3985, 0xff922f, 0xffdf38, 0x39dbba, 0x36bfff, 0x9862ef,
];
export const WATER_POOL = Object.freeze({
  minX: -232,
  maxX: -101,
  minZ: -121,
  maxZ: -83,
  surface: 2.4,
  exitX: -110,
  exitZ: -84,
  shoreX: -110,
  shoreZ: -76,
});
export const WATER_BOWL = Object.freeze({
  x: -131,
  z: -198,
  radius: 24,
  hole: 4.4,
  bottom: 17,
  depth: 20,
});
export const WATER_SLIDES = [
  {
    name: "Cosmic Plunge",
    height: 300,
    description: "300 m · space-height straight drop",
    speed: 64,
    color: 0xff3985,
    entry: { x: -223, z: -135 },
    start: [-223, 300, -144],
  },
  {
    name: "Rainbow Twister",
    height: 128,
    description: "128 m · four huge swirling turns",
    speed: 28,
    color: 0x25c9ca,
    entry: { x: -204, z: -280 },
    start: [-204, 128, -290],
  },
  {
    name: "Loop Lagoon",
    height: 110,
    description: "Two loops · whirlpool bowl · splash pool",
    speed: 32,
    color: 0x9c62ed,
    entry: { x: -129, z: -314 },
    start: [-129, 110, -323],
  },
];
export function insideWaterPark(p) {
  const b = WATER_PARK_BOUNDS;
  return p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ;
}
export function bowlHeight(radius) {
  return (
    WATER_BOWL.bottom + WATER_BOWL.depth * (radius / WATER_BOWL.radius) ** 2
  );
}

export function createWaterSlide(index = 0) {
  const nodes = [],
    tags = {};
  if (index === 0) {
    nodes.push(
      ...[
        [-223, 300, -144],
        [-218, 300, -144],
        [-213, 295, -144],
        [-212, 290, -144],
        [-212, 282, -144],
        [-212, 240, -144],
        [-212, 190, -144],
        [-212, 140, -144],
        [-212, 90, -144],
        [-212, 44, -144],
        [-212, 24, -142],
        [-212, 13, -133],
        [-212, 10, -123],
        [-212, 10, -115],
      ],
    );
  } else if (index === 1) {
    nodes.push([-204, 128, -290], [-201, 128, -282], [-197, 125, -274]);
    // Four complete turns with 21 m vertical clearance per revolution.
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 8;
      nodes.push([
        -188 + 24 * Math.sin(a),
        121 - (i / 128) * 84,
        -248 - 24 * Math.cos(a),
      ]);
    }
    nodes.push(
      [-173, 33, -268],
      [-160, 29, -248],
      [-160, 24, -221],
      [-176, 19, -193],
      [-181, 14, -162],
      [-178, 10, -131],
      [-177, 10, -115],
    );
  } else {
    nodes.push(
      [-129, 110, -323],
      [-129, 110, -315],
      [-129, 95, -303],
      [-129, 50, -296],
      [-129, 19, -289],
      [-129, 17, -276],
    );
    tags.loopStart = nodes.length - 1;
    for (let i = 1; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      nodes.push([
        -129 + (10 * i) / 48,
        17 + 17 * (1 - Math.cos(a)),
        -276 + 17 * Math.sin(a),
      ]);
    }
    nodes.push([-118, 20, -261], [-117, 24, -249], [-117, 24, -238]);
    for (let i = 1; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      nodes.push([
        -117 - (16 * i) / 40,
        24 + 12 * (1 - Math.cos(a)),
        -238 + 12 * Math.sin(a),
      ]);
    }
    tags.loopEnd = nodes.length - 1;
    // Approach joins the east rim tangentially, without a hairpin at entry.
    nodes.push(
      [-140, 30, -228],
      [-145, 42, -213],
      [-122, 47, -209],
      [-107, 43, -218],
      [-104, 40, -207],
    );
    tags.bowlStart = nodes.length;
    for (let i = 0; i <= 144; i++) {
      const t = i / 144,
        a = Math.PI / 2 + t * Math.PI * 6,
        r = 24 - 20.8 * t;
      nodes.push([
        WATER_BOWL.x + r * Math.sin(a),
        bowlHeight(r) + 1.35,
        WATER_BOWL.z - r * Math.cos(a),
      ]);
    }
    tags.bowlEnd = nodes.length - 1;
    // A real hole and a curved drain underneath the open bowl.
    nodes.push(
      [-128, 17.8, -195],
      [-128, 15.8, -191],
      [-126, 12, -186],
      [-125, 10.3, -177],
      [-124, 10.3, -157],
      [-124, 10, -133],
      [-124, 10, -115],
    );
  }
  const curve = new THREE.CatmullRomCurve3(
    nodes.map((p) => new THREE.Vector3(...p)),
    false,
    "centripetal",
  );
  curve.arcLengthDivisions = 12000;
  const length = curve.getLength(),
    count = Math.ceil(length * 4);
  const points = [],
    tangents = [],
    rights = [],
    ups = [],
    rotations = [];
  let previous, right;
  const sections = {};
  for (let i = 0; i <= count; i++) {
    const u = i / count,
      node = curve.getUtoTmapping(u) * (nodes.length - 1),
      tangent = curve.getTangentAt(u).normalize();
    for (const [name, at] of Object.entries(tags))
      if (sections[name] === undefined && node >= at)
        sections[name] = u * length;
    if (!previous)
      right = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), tangent)
        .normalize();
    else
      right.applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(previous, tangent),
      );
    right.addScaledVector(tangent, -right.dot(tangent)).normalize();
    // Keep spiral and bowl riders upright. Transport the frame through true
    // vertical drops/inversions, where world-up alone has a singularity.
    const upright = index === 1 || (index === 2 && node > tags.loopEnd + 1);
    let renderRight = right.clone();
    if (upright && Math.abs(tangent.y) < 0.98) {
      const desired = new THREE.Vector3()
        .crossVectors(new THREE.Vector3(0, 1, 0), tangent)
        .normalize();
      const blend =
        index === 1
          ? 1
          : THREE.MathUtils.smoothstep(
              node,
              tags.loopEnd + 1,
              tags.loopEnd + 3,
            );
      const angle = Math.atan2(
        tangent.dot(new THREE.Vector3().crossVectors(renderRight, desired)),
        renderRight.dot(desired),
      );
      renderRight.applyAxisAngle(tangent, angle * blend);
    }
    const up = new THREE.Vector3()
      .crossVectors(tangent, renderRight)
      .normalize();
    points.push(curve.getPointAt(u));
    tangents.push(tangent);
    rights.push(renderRight);
    ups.push(up);
    rotations.push(
      new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(renderRight, up, tangent),
      ),
    );
    previous = tangent;
  }
  const track = {
    index,
    curve,
    length,
    count,
    points,
    tangents,
    rights,
    ups,
    rotations,
    ...sections,
    sample(distance) {
      const f = THREE.MathUtils.clamp(distance / length, 0, 1) * count,
        i = Math.min(count - 1, Math.floor(f)),
        a = f - i;
      const rotation = rotations[i].clone().slerp(rotations[i + 1], a);
      return {
        position: points[i].clone().lerp(points[i + 1], a),
        rotation,
        tangent: new THREE.Vector3(0, 0, 1).applyQuaternion(rotation),
        right: new THREE.Vector3(1, 0, 0).applyQuaternion(rotation),
        up: new THREE.Vector3(0, 1, 0).applyQuaternion(rotation),
      };
    },
    inBowl(distance) {
      return (
        index === 2 && distance >= this.bowlStart && distance <= this.bowlEnd
      );
    },
  };
  return track;
}

// Kept independent of rendering so pause, timing, ballistic splashdown and
// swimming containment can be verified at different frame rates.
export class WaterSlideRide {
  constructor(track) {
    this.track = track;
    this.reset();
  }
  reset() {
    this.state = "waiting";
    this.distance = 0;
    this.speed = 0;
    this.elapsed = 0;
    this.phase = "Choose a lift";
    this.liftTime = 0;
    this.dropTime = 0;
    this.swimTime = 0;
  }
  board() {
    if (this.state !== "waiting") return false;
    this.state = "lifting";
    this.phase = "Rainbow lift · going up";
    return true;
  }
  launch() {
    if (this.state !== "seated") return false;
    this.state = "riding";
    this.phase = "Here we go!";
    return true;
  }
  update(dt) {
    for (let left = Math.min(Math.max(dt, 0), 0.1); left > 1e-8; ) {
      const h = Math.min(left, 1 / 120);
      left -= h;
      if (this.state === "lifting") {
        this.liftTime = Math.min(5, this.liftTime + h);
        if (this.liftTime >= 5) {
          this.state = "seated";
          this.phase = "At the top · start when you are ready";
        }
      } else if (this.state === "riding") {
        this.elapsed += h;
        const s = this.track.sample(this.distance),
          remain = this.track.length - this.distance;
        const bowl = this.track.inBowl(this.distance),
          gentle = this.gentle ? 0.62 : 1;
        let target = WATER_SLIDES[this.track.index].speed * gentle;
        if (bowl) target = 16 * gentle;
        if (remain < 26)
          target = THREE.MathUtils.lerp(
            8,
            target,
            THREE.MathUtils.smoothstep(remain, 3, 26),
          );
        this.speed = THREE.MathUtils.damp(
          this.speed,
          target,
          bowl || remain < 26 ? 2.2 : 0.8,
          h,
        );
        this.phase = bowl
          ? "Swishing around the giant bowl"
          : remain < 22
            ? "Outlet ahead · splash pool next"
            : s.up.y < -0.3
              ? "Upside down in the rainbow loop!"
              : s.tangent.y < -0.8
                ? "Straight down from the sky!"
                : "Rushing through the rainbow";
        this.distance = Math.min(
          this.track.length,
          this.distance + this.speed * h,
        );
        if (this.distance >= this.track.length) {
          this.state = "dropping";
          this.phase = "Splashdown!";
          this.dropOrigin = s.position.copy(this.track.points.at(-1));
          this.dropPosition = this.dropOrigin.clone();
          this.dropSpeed = 8;
          this.dropTime = 0;
        }
      } else if (this.state === "dropping") {
        this.dropTime += h;
        const origin = this.dropOrigin;
        this.dropPosition = new THREE.Vector3(
          origin.x,
          origin.y - 4.9 * this.dropTime ** 2,
          origin.z + this.dropSpeed * this.dropTime,
        );
        if (this.dropPosition.y <= WATER_POOL.surface + 1) {
          this.dropPosition.y = WATER_POOL.surface + 1;
          this.state = "swimming";
          this.speed = 0;
          this.phase = "Swim to the yellow exit steps";
          this.swimmer = new THREE.Vector3(
            this.dropPosition.x,
            WATER_POOL.surface - 1.05,
            this.dropPosition.z,
          );
        }
      }
    }
  }
  swim(dt, x, z) {
    if (this.state !== "swimming") return false;
    const h = Math.min(Math.max(dt, 0), 0.1),
      length = Math.hypot(x, z),
      speed = this.gentle ? 4 : 5.5;
    if (length > 1) {
      x /= length;
      z /= length;
    }
    this.swimTime += h;
    this.swimmer.x = THREE.MathUtils.clamp(
      this.swimmer.x + x * speed * h,
      WATER_POOL.minX + 1,
      WATER_POOL.maxX - 1,
    );
    this.swimmer.z = THREE.MathUtils.clamp(
      this.swimmer.z + z * speed * h,
      WATER_POOL.minZ + 1,
      WATER_POOL.maxZ - 1,
    );
    return (
      Math.abs(this.swimmer.x - WATER_POOL.exitX) < 3.5 &&
      this.swimmer.z > WATER_POOL.exitZ - 2
    );
  }
}
