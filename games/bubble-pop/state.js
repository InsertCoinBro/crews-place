export const BUBBLE_SETTINGS = {
  target: 100,
  spawnEvery: 0.56,
  speed: 7.8,
  celebration: 2.8,
};
export class BubbleRound {
  constructor() {
    this.count = 0;
    this.phase = "playing";
    this.celebrationRemaining = 0;
  }
  pop(bubble) {
    if (this.phase !== "playing" || bubble.popped) return false;
    bubble.popped = true;
    this.count++;
    if (this.count >= BUBBLE_SETTINGS.target) {
      this.phase = "complete";
      this.celebrationRemaining = BUBBLE_SETTINGS.celebration;
    }
    return true;
  }
  tick(dt) {
    if (this.phase !== "complete") return false;
    this.celebrationRemaining -= dt;
    return this.celebrationRemaining <= 0;
  }
}
