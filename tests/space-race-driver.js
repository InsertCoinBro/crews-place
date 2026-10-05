// Test pilot: use only ordinary steering and earned power-ups, never set progress.
export function racePilot(run) {
  const r = run.racers[0],
    track = run.track;
  let target = r.lane,
    best = -Infinity;
  for (const lane of [-5, 0, 5]) {
    let score = -Math.abs(lane - r.lane) * 0.12;
    for (const hazard of [
      ...track.obstacles,
      ...track.brakes,
      ...track.meteors,
    ]) {
      const gap = run.nextDistance(hazard, r.distance) - r.distance;
      if (gap > -8 && gap < 145 && Math.abs(lane - hazard.lane) < 3)
        score -= 25;
    }
    for (const pad of [...track.boosts, ...track.pickups]) {
      const gap = run.nextDistance(pad, r.distance) - r.distance;
      if (gap > 0 && gap < 110 && Math.abs(lane - pad.lane) < 2.7)
        score += 8 * (1 - gap / 180);
    }
    for (const other of run.racers.slice(1)) {
      const gap = other.distance - r.distance;
      if (gap > -8 && gap < 35 && Math.abs(lane - other.lane) < 4.4)
        score -= 15;
    }
    if (score > best) {
      target = lane;
      best = score;
    }
  }
  return {
    steer: Math.abs(target - r.lane) < 0.4 ? 0 : Math.sign(target - r.lane),
    usePowerup:
      r.powerup !== "pulse" ||
      run.racers
        .slice(1)
        .some((other) => Math.abs(other.distance - r.distance) < 90),
  };
}
