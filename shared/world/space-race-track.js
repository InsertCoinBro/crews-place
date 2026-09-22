import * as THREE from "three";

export const RACE_ENTRY = Object.freeze({ x: -141, z: 80 });
export const RACE_HALF_WIDTH = 10;
export const RACE_LANE_LIMIT = 7;
export const RACE_MAX_SPEED = 48;
export const RACE_BOOST_SPEED = 54;
export const RACE_COLORS = [0x70dfd4, 0xffce72, 0xbda2ef, 0xf699b2, 0x81baf6];

export function createSpaceRaceTrack() {
  const curve = new THREE.CatmullRomCurve3(
    [
      [-165, 80],
      [-160, -140],
      [-180, -435],
      [-285, -625],
      [-505, -650],
      [-710, -490],
      [-720, -240],
      [-535, -175],
      [-385, -260],
      [-325, -70],
      [-490, 35],
      [-695, 130],
      [-700, 395],
      [-565, 585],
      [-350, 625],
      [-185, 510],
      [-165, 300],
    ].map(([x, z]) => new THREE.Vector3(x, 0, z)),
    true,
    "centripetal",
  );
  curve.arcLengthDivisions = 12000;
  const length = curve.getLength();
  const jumps = [0.13, 0.37, 0.63, 0.83].map((t) => ({
    start: t * length,
    ramp: 32,
    flight: 90,
  }));
  const sample = (distance, lane = 0) => {
    const t = (((distance % length) + length) % length) / length;
    const position = curve.getPointAt(t),
      tangent = curve.getTangentAt(t).normalize();
    const right = new THREE.Vector3(tangent.z, 0, -tangent.x);
    position.addScaledVector(right, lane);
    let roadY = 0.22,
      lift = 0,
      pitch = 0;
    for (const jump of jumps) {
      const d = (distance % length) - jump.start;
      if (d >= 0 && d < jump.ramp) {
        roadY += (d / jump.ramp) * 3.2;
        pitch = Math.atan2(3.2, jump.ramp);
      } else if (d >= jump.ramp && d < jump.ramp + 8)
        roadY += (1 - (d - jump.ramp) / 8) * 3.2;
      if (d >= jump.ramp && d <= jump.ramp + jump.flight) {
        const u = (d - jump.ramp) / jump.flight;
        const air = 3.2 * (1 - u) + 4 * 9 * u * (1 - u);
        lift = Math.max(0, air - (roadY - 0.22));
        pitch = Math.atan2(-3.2 + 36 * (1 - 2 * u), jump.flight);
      }
    }
    position.y = roadY;
    return {
      position,
      tangent,
      right,
      roadY,
      lift,
      pitch,
      heading: Math.atan2(tangent.x, tangent.z),
    };
  };
  const obstacles = Array.from({ length: 18 }, (_, i) => ({
    distance: length * (0.065 + i * 0.048),
    lane: [-5, 0, 5, 0, 5, -5][i % 6],
  })).filter(
    (o) =>
      !jumps.some(
        (j) =>
          o.distance > j.start - 25 &&
          o.distance < j.start + j.ramp + j.flight + 30,
      ),
  );
  const boosts = [0.06, 0.29, 0.52, 0.77, 0.94].map((t, i) => ({
    distance: t * length,
    lane: [0, -5, 5, -5, 0][i],
  }));
  return { curve, length, jumps, obstacles, boosts, sample };
}

export class SpaceRaceRun {
  constructor(track) {
    this.track = track;
    this.reset();
  }
  reset() {
    this.state = "ready";
    this.countdown = 3;
    this.elapsed = 0;
    this.place = 1;
    this.notice = "";
    this.racers = [0, 1, 2].map((id) => ({
      id,
      distance: 0,
      lane: [0, -5, 5][id],
      speed: 0,
      finish: null,
      slow: 0,
      boost: 0,
      hits: new Set(),
      pads: new Set(),
    }));
  }
  start() {
    if (this.state !== "ready") return false;
    this.state = "countdown";
    return true;
  }
  update(
    dt,
    { steer = 0, throttle = true, brake = false, gentle = false } = {},
  ) {
    dt = Math.min(0.05, Math.max(0, dt));
    if (this.state === "countdown") {
      this.countdown = Math.max(0, this.countdown - dt);
      if (this.countdown === 0) this.state = "racing";
      return;
    }
    if (this.state !== "racing") return;
    const previous = this.elapsed;
    this.elapsed += dt;
    const step = dt * (gentle ? 0.7 : 1);
    this.notice = "";
    for (const r of this.racers) {
      if (r.finish !== null) continue;
      r.slow = Math.max(0, r.slow - step);
      r.boost = Math.max(0, r.boost - step);
      const old = r.distance;
      if (r.id === 0)
        r.lane = THREE.MathUtils.clamp(
          r.lane + steer * step * 10,
          -RACE_LANE_LIMIT,
          RACE_LANE_LIMIT,
        );
      else {
        const ahead = this.track.obstacles.find(
          (o) => o.distance > r.distance - 8 && o.distance < r.distance + 75,
        );
        const preferred = r.id === 1 ? -5 : 5;
        const desired =
          ahead && Math.abs(ahead.lane - preferred) < 2.8 ? 0 : preferred;
        r.lane = THREE.MathUtils.damp(r.lane, desired, 2.5, step);
      }
      const target =
        r.id === 0
          ? brake
            ? 12
            : throttle
              ? r.boost > 0
                ? RACE_BOOST_SPEED
                : RACE_MAX_SPEED
              : 0
          : (r.id === 1 ? 45.3 : 42) + Math.sin(r.distance / 130 + r.id) * 1.4;
      r.speed = THREE.MathUtils.damp(
        r.speed,
        r.slow > 0 ? Math.min(18, target) : target,
        3,
        step,
      );
      r.distance = Math.min(this.track.length, r.distance + r.speed * step);
      for (const [i, o] of this.track.obstacles.entries()) {
        if (!r.hits.has(i) && old <= o.distance && r.distance >= o.distance) {
          r.hits.add(i);
          if (
            Math.abs(r.lane - o.lane) < 2.4 &&
            this.track.sample(o.distance).lift < 2
          ) {
            r.slow = 2;
            if (!r.id) this.notice = "Soft bumper · keep going!";
          }
        }
      }
      if (!r.id)
        for (const [i, b] of this.track.boosts.entries()) {
          if (!r.pads.has(i) && old <= b.distance && r.distance >= b.distance) {
            r.pads.add(i);
            if (Math.abs(r.lane - b.lane) < 2.7) {
              r.boost = 3;
              this.notice = "Star boost!";
            }
          }
        }
      if (r.distance >= this.track.length)
        r.finish =
          previous +
          (dt * (this.track.length - old)) / Math.max(0.00001, r.speed * step);
    }
    const player = this.racers[0];
    this.place =
      1 +
      this.racers
        .slice(1)
        .filter((r) =>
          player.finish !== null
            ? r.finish !== null && r.finish <= player.finish
            : r.distance > player.distance,
        ).length;
    if (player.finish !== null) this.state = "finished";
  }
}
