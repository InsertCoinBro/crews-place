import * as THREE from "three";

export const RACE_ENTRY = Object.freeze({ x: -141, z: 80 });
export const RACE_HALF_WIDTH = 10;
export const RACE_LANE_LIMIT = 7;
export const RACE_MAX_SPEED = 88;
export const RACE_BOOST_SPEED = 118;
export const RACE_LAPS = 2;
export const RACER_WIDTH = 4.4;
export const RACER_LENGTH = 6.2;
export const RACE_COLORS = [0x00edff, 0xffad19, 0x9955ff, 0xff328e, 0x307cff];

export function meteorState(meteor, time) {
  const phase = ((time + meteor.offset) % meteor.period) / meteor.period;
  return {
    warning: phase < 0.65,
    falling: phase >= 0.4 && phase < 0.65,
    impact: phase >= 0.65 && phase < 0.83,
    fall: THREE.MathUtils.clamp((phase - 0.4) / 0.25, 0, 1),
  };
}

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
  const jumps = [0.13, 0.37, 0.63, 0.83].map((t, i) => ({
    start: t * length,
    ramp: 55,
    height: [12, 16, 18, 14][i],
    peak: [34, 46, 58, 40][i],
    flight: [215, 240, 270, 230][i],
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
      const d = t * length - jump.start;
      if (d >= 0 && d < jump.ramp) {
        roadY += (d / jump.ramp) * jump.height;
        pitch = Math.atan2(jump.height, jump.ramp);
      } else if (d >= jump.ramp && d < jump.ramp + 18)
        roadY += (1 - (d - jump.ramp) / 18) * jump.height;
      if (d >= jump.ramp && d <= jump.ramp + jump.flight) {
        const u = (d - jump.ramp) / jump.flight;
        const air = jump.height * (1 - u) + 4 * jump.peak * u * (1 - u);
        lift = Math.max(0, air - (roadY - 0.22));
        pitch = Math.atan2(
          -jump.height + 4 * jump.peak * (1 - 2 * u),
          jump.flight,
        );
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
  const boosts = [0.06, 0.12, 0.29, 0.36, 0.52, 0.62, 0.77, 0.82, 0.94].map(
    (t, i) => ({
      distance: t * length,
      lane: [0, -5, 5, 0, 5, 0, -5, 5, 0][i],
    }),
  );
  const brakes = [0.095, 0.26, 0.51, 0.74, 0.965].map((t, i) => ({
    distance: t * length,
    lane: [-5, 5, 0, 5, -5][i],
  }));
  const pickups = [0.035, 0.205, 0.315, 0.46, 0.58, 0.715, 0.92].map(
    (t, i) => ({
      distance: t * length,
      lane: [0, -5, 5, 0, -5, 5, 0][i],
      type: ["turbo", "shield", "pulse"][i % 3],
    }),
  );
  const meteors = [0.085, 0.275, 0.555, 0.75, 0.955].map((t, i) => ({
    distance: t * length,
    lane: [-5, 0, 5, -5, 5][i],
    period: 7.5 + i * 0.4,
    offset: i * 1.7,
  }));
  const tunnels = [0.23, 0.48, 0.925].map((t) => ({
    start: t * length,
    length: 110,
  }));
  const rings = jumps.flatMap((j, jump) =>
    [0.2, 0.5, 0.8].map((u) => ({
      distance: j.start + j.ramp + j.flight * u,
      lane: 0,
      jump,
    })),
  );
  return {
    curve,
    length,
    raceDistance: length * RACE_LAPS,
    jumps,
    obstacles,
    boosts,
    brakes,
    pickups,
    meteors,
    tunnels,
    rings,
    sample,
  };
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
      shield: 0,
      contact: 0,
      powerup: null,
      rings: 0,
      hits: new Set(),
      pads: new Set(),
      collected: new Set(),
      meteorHits: new Set(),
    }));
  }
  start() {
    if (this.state !== "ready") return false;
    this.state = "countdown";
    return true;
  }
  usePowerup(id = 0) {
    const racer = this.racers[id];
    if (this.state !== "racing" || !racer.powerup || racer.finish !== null)
      return false;
    const type = racer.powerup;
    racer.powerup = null;
    if (type === "turbo") racer.boost = Math.max(racer.boost, 4.8);
    if (type === "shield") {
      racer.shield = 7;
      racer.slow = 0;
    }
    if (type === "pulse") {
      for (const other of this.racers) {
        if (
          other !== racer &&
          !other.shield &&
          Math.abs(other.distance - racer.distance) < 90
        )
          other.slow = Math.max(other.slow, 1.8);
      }
      racer.boost = Math.max(racer.boost, 1.2);
    }
    if (!id)
      this.notice = {
        turbo: "Turbo ignited!",
        shield: "Shield online!",
        pulse: "Gravity pulse!",
      }[type];
    return true;
  }
  nextDistance(feature, distance) {
    let d =
      Math.floor(distance / this.track.length) * this.track.length +
      feature.distance;
    if (d < distance - 6) d += this.track.length;
    return d;
  }
  rivalLane(r) {
    let best = r.lane,
      bestScore = -Infinity;
    for (const lane of [-5, 0, 5]) {
      let score = -Math.abs(lane - r.lane) * 0.35;
      for (const o of [...this.track.obstacles, ...this.track.brakes]) {
        const gap = this.nextDistance(o, r.distance) - r.distance;
        if (gap >= -6 && gap < 190 && Math.abs(lane - o.lane) < 3)
          score -= 32 * (1 - Math.max(0, gap) / 240);
      }
      for (const m of this.track.meteors) {
        const gap = this.nextDistance(m, r.distance) - r.distance;
        const future = meteorState(
          m,
          this.elapsed + Math.max(0, gap) / Math.max(40, r.speed),
        );
        if (
          gap >= -6 &&
          gap < 190 &&
          Math.abs(lane - m.lane) < 3 &&
          (future.warning || future.impact)
        )
          score -= 25;
      }
      for (const b of [
        ...this.track.boosts,
        ...(!r.powerup ? this.track.pickups : []),
      ]) {
        const gap = this.nextDistance(b, r.distance) - r.distance;
        if (gap > 0 && gap < 140 && Math.abs(lane - b.lane) < 2.5)
          score += 12 * (1 - gap / 180);
      }
      for (const other of this.racers) {
        const gap = other.distance - r.distance;
        if (
          other !== r &&
          other.finish === null &&
          gap > -RACER_LENGTH &&
          gap < 65 &&
          Math.abs(lane - other.lane) < RACER_WIDTH
        )
          score -= 20 * (1 - Math.max(0, gap) / 85);
      }
      if (score > bestScore) {
        bestScore = score;
        best = lane;
      }
    }
    return best;
  }
  resolveContacts(previous) {
    // Swept longitudinal tests prevent a boosted ship passing through a slower
    // rival between frames. Side contacts separate hulls without a spin-out.
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < this.racers.length; i++)
        for (let j = i + 1; j < this.racers.length; j++) {
          const a = this.racers[i],
            b = this.racers[j];
          if (a.finish !== null || b.finish !== null) continue;
          const lapOffset =
            Math.round(
              (previous[j].distance - previous[i].distance) / this.track.length,
            ) * this.track.length;
          const dx = b.lane - a.lane,
            dz = b.distance - a.distance - lapOffset;
          const oldZ = previous[j].distance - previous[i].distance - lapOffset;
          const crossed = oldZ * dz < 0;
          if (
            Math.abs(dx) >= RACER_WIDTH ||
            (!crossed && Math.abs(dz) >= RACER_LENGTH)
          )
            continue;
          const ay = this.track.sample(a.distance),
            by = this.track.sample(b.distance);
          if (Math.abs(ay.roadY + ay.lift - by.roadY - by.lift) > 3) continue;
          const oldSide = previous[j].lane - previous[i].lane;
          const sideContact =
            !crossed &&
            Math.abs(oldZ) < RACER_LENGTH &&
            Math.abs(oldSide) > 0.5;
          if (sideContact) {
            const direction = Math.sign(oldSide),
              center = (a.lane + b.lane) / 2;
            a.lane = THREE.MathUtils.clamp(
              center - (direction * RACER_WIDTH) / 2,
              -RACE_LANE_LIMIT,
              RACE_LANE_LIMIT,
            );
            b.lane = THREE.MathUtils.clamp(
              a.lane + direction * RACER_WIDTH,
              -RACE_LANE_LIMIT,
              RACE_LANE_LIMIT,
            );
            a.lane = b.lane - direction * RACER_WIDTH;
          } else {
            const front = oldZ >= 0 ? b : a,
              rear = oldZ >= 0 ? a : b;
            const gap = oldZ >= 0 ? dz : -dz;
            rear.distance = Math.max(0, rear.distance - (RACER_LENGTH - gap));
            rear.speed = Math.min(rear.speed, front.speed);
          }
          if (!a.contact && !b.contact && (i === 0 || j === 0))
            this.notice = "Hull contact · steer into an open lane";
          a.contact = b.contact = 0.4;
        }
    }
  }
  update(
    dt,
    {
      steer = 0,
      throttle = true,
      brake = false,
      gentle = false,
      usePowerup = false,
    } = {},
  ) {
    dt = Math.min(0.05, Math.max(0, dt));
    if (this.state === "countdown") {
      this.countdown = Math.max(0, this.countdown - dt);
      if (this.countdown === 0) this.state = "racing";
      return;
    }
    if (this.state !== "racing") return;
    const previousTime = this.elapsed;
    this.elapsed += dt;
    const step = dt * (gentle ? 0.7 : 1);
    this.notice = "";
    if (usePowerup) this.usePowerup();
    const previous = this.racers.map((r) => ({
      distance: r.distance,
      lane: r.lane,
    }));
    for (const r of this.racers) {
      if (r.finish !== null) continue;
      r.slow = Math.max(0, r.slow - step);
      r.boost = Math.max(0, r.boost - step);
      r.shield = Math.max(0, r.shield - step);
      r.contact = Math.max(0, r.contact - step);
      if (r.id === 0)
        r.lane = THREE.MathUtils.clamp(
          r.lane + steer * step * 14,
          -RACE_LANE_LIMIT,
          RACE_LANE_LIMIT,
        );
      else {
        const desired = this.rivalLane(r);
        r.lane += THREE.MathUtils.clamp(
          desired - r.lane,
          -11 * step,
          11 * step,
        );
        if (r.powerup && (r.powerup !== "turbo" || r.boost < 0.2))
          this.usePowerup(r.id);
      }
      const target =
        r.id === 0
          ? brake
            ? 16
            : throttle
              ? r.boost > 0
                ? RACE_BOOST_SPEED
                : RACE_MAX_SPEED
              : 0
          : r.boost > 0
            ? RACE_BOOST_SPEED - r.id
            : (r.id === 1 ? 80.5 : 79.5) +
              Math.sin(r.distance / 130 + r.id) * 1.5;
      const drafting = this.racers.some(
        (other) =>
          other !== r &&
          other.distance - r.distance > 8 &&
          other.distance - r.distance < 40 &&
          Math.abs(other.lane - r.lane) < 2.8,
      );
      r.speed = THREE.MathUtils.damp(
        r.speed,
        r.slow > 0
          ? Math.min(30, target)
          : Math.min(
              RACE_BOOST_SPEED,
              target +
                (drafting && (r.id !== 0 || (!brake && throttle)) ? 4 : 0),
            ),
        3,
        step,
      );
      r.distance = Math.min(
        this.track.raceDistance,
        r.distance + r.speed * step,
      );
    }
    this.resolveContacts(previous);
    for (const r of this.racers) {
      if (r.finish !== null) continue;
      const old = previous[r.id].distance;
      const crossed = (features, visited, fn) => {
        for (
          let lap = Math.floor(old / this.track.length);
          lap <= Math.floor(r.distance / this.track.length) && lap < RACE_LAPS;
          lap++
        ) {
          features.forEach((f, i) => {
            const at = f.distance + lap * this.track.length,
              key = `${lap}:${i}`;
            if (!visited.has(key) && old <= at && r.distance >= at) {
              visited.add(key);
              if (Math.abs(r.lane - f.lane) < 2.7) fn(f, key);
            }
          });
        }
      };
      crossed([...this.track.obstacles, ...this.track.brakes], r.hits, () => {
        if (!r.shield) {
          r.slow = 1.65;
          if (!r.id)
            this.notice = "Magnetic stopper · steer around amber panels";
        }
      });
      crossed(this.track.boosts, r.pads, () => {
        r.boost = Math.max(r.boost, 2.6);
        if (!r.id) this.notice = "Plasma boost!";
      });
      crossed(this.track.pickups, r.collected, (p) => {
        if (!r.powerup) r.powerup = p.type;
        if (!r.id)
          this.notice = `${p.type.toUpperCase()} ready · F or Use power-up`;
      });
      // Full-width jump rings reward every clean airborne pass.
      for (
        let lap = Math.floor(old / this.track.length);
        lap <= Math.floor(r.distance / this.track.length) && lap < RACE_LAPS;
        lap++
      ) {
        for (const [i, ring] of this.track.rings.entries()) {
          const at = ring.distance + lap * this.track.length,
            key = `ring:${lap}:${i}`;
          if (old <= at && r.distance >= at && !r.collected.has(key)) {
            r.collected.add(key);
            r.rings++;
            r.boost = Math.max(r.boost, 0.7);
            if (!r.id) this.notice = "Fire ring cleared!";
          }
        }
      }
      for (const [i, meteor] of this.track.meteors.entries()) {
        const state = meteorState(meteor, this.elapsed);
        const cycle = Math.floor(
          (this.elapsed + meteor.offset) / meteor.period,
        );
        const key = `${i}:${cycle}`;
        const at = this.nextDistance(meteor, r.distance);
        if (
          state.impact &&
          Math.abs(at - r.distance) < 9 &&
          Math.abs(r.lane - meteor.lane) < 3 &&
          !r.meteorHits.has(key)
        ) {
          r.meteorHits.add(key);
          if (!r.shield) {
            r.slow = 2.3;
            if (!r.id)
              this.notice = "Meteor wake · shields protect against impacts";
          }
        }
      }
      if (r.distance >= this.track.raceDistance)
        r.finish =
          previousTime +
          (dt * (this.track.raceDistance - old)) /
            Math.max(0.00001, r.speed * step);
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
