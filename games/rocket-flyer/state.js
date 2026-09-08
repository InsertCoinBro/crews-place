export const ROCKET_LEVELS = Array.from({ length: 10 }, (_, index) => ({
  level: index + 1,
  diamonds: 50,
  health: 3,
  speed: 3.7 + index * 0.28,
  obstacleEvery: 2.9 - index * 0.11,
  diamondEvery: 0.62,
  alienDrift: 0.35 + index * 0.065,
  invulnerability: 2,
  celebration: 2,
}));
export class RocketCampaign {
  constructor() {
    this.level = 1;
    this.resetLevel();
  }
  get settings() {
    return ROCKET_LEVELS[this.level - 1];
  }
  resetLevel() {
    this.diamonds = 0;
    this.health = this.settings.health;
    this.invulnerable = this.settings.invulnerability;
    this.phase = "playing";
    this.transition = 0;
  }
  collect(entity) {
    if (this.phase !== "playing" || entity.collected) return false;
    entity.collected = true;
    this.diamonds++;
    if (this.diamonds >= this.settings.diamonds) {
      this.phase =
        this.level === ROCKET_LEVELS.length ? "complete" : "level-clear";
      this.transition = this.settings.celebration;
    }
    return true;
  }
  hit() {
    if (this.phase !== "playing" || this.invulnerable > 0) return false;
    this.health--;
    this.invulnerable = this.settings.invulnerability;
    if (this.health <= 0) this.phase = "failed";
    return true;
  }
  tick(dt) {
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    if (this.phase === "level-clear") {
      this.transition -= dt;
      if (this.transition <= 0) {
        this.level++;
        this.resetLevel();
        return "next-level";
      }
    }
    return null;
  }
  retry() {
    this.resetLevel();
  }
  restart() {
    this.level = 1;
    this.resetLevel();
  }
}
