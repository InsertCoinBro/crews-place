import { PAIRS } from "../shared/art.js";
export const MEMORY_SETTINGS = {
  columns: 6,
  rows: 4,
  previewSeconds: 6,
  dwellSeconds: 0.8,
  mismatchSeconds: 1.15,
  hopSeconds: 0.27,
};
export function shuffledDeck(random = Math.random, previous = null) {
  const deck = PAIRS.flatMap((p) => [p.id, p.id]);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  if (previous && deck.every((id, i) => id === previous[i])) {
    const different = deck.findIndex((id) => id !== deck[0]);
    [deck[0], deck[different]] = [deck[different], deck[0]];
  }
  return deck;
}
export class MemoryRound {
  constructor(settings = MEMORY_SETTINGS, random = Math.random) {
    this.settings = { ...settings };
    this.random = random;
    this.reset();
  }
  reset() {
    const previous = this.tiles?.map((t) => t.pair);
    this.tiles = shuffledDeck(this.random, previous).map((pair) => ({
      pair,
      revealed: false,
      matched: false,
    }));
    this.phase = "preview";
    this.previewRemaining = this.settings.previewSeconds;
    this.current = 0;
    this.target = 0;
    this.moving = false;
    this.first = null;
    this.second = null;
    this.pairs = 0;
    this.dwell = 0;
    this.armed = true;
    this.mismatchRemaining = 0;
  }
  move(dx, dz) {
    if (this.phase === "preview" || this.phase === "complete" || this.moving)
      return false;
    const c = this.current % 6,
      r = Math.floor(this.current / 6),
      nc = c + dx,
      nr = r + dz;
    if (nc < 0 || nc >= 6 || nr < 0 || nr >= 4) return false;
    this.target = nr * 6 + nc;
    this.moving = true;
    this.dwell = 0;
    this.armed = false;
    return true;
  }
  land() {
    this.current = this.target;
    this.moving = false;
    this.dwell = 0;
    this.armed = true;
  }
  tick(dt) {
    if (this.phase === "preview") {
      this.previewRemaining = Math.max(0, this.previewRemaining - dt);
      if (this.previewRemaining === 0) {
        this.phase = "playing";
        return "ready";
      }
      return null;
    }
    if (this.phase === "mismatch") {
      this.mismatchRemaining -= dt;
      if (this.mismatchRemaining <= 0) {
        this.tiles[this.first].revealed = false;
        this.tiles[this.second].revealed = false;
        this.first = this.second = null;
        this.phase = "playing";
      }
      return null;
    }
    if (this.phase !== "playing" || this.moving || !this.armed) return null;
    const tile = this.tiles[this.current];
    if (tile.matched || tile.revealed) return null;
    this.dwell += dt;
    if (this.dwell + 1e-9 < this.settings.dwellSeconds) return null;
    this.armed = false;
    this.dwell = 0;
    tile.revealed = true;
    if (this.first === null) {
      this.first = this.current;
      return "reveal";
    }
    this.second = this.current;
    if (this.first === this.second) return null;
    if (this.tiles[this.first].pair === tile.pair) {
      this.tiles[this.first].matched = tile.matched = true;
      this.first = this.second = null;
      this.pairs++;
      if (this.pairs === 12) {
        this.phase = "complete";
        return "win";
      }
      return "match";
    }
    this.phase = "mismatch";
    this.mismatchRemaining = this.settings.mismatchSeconds;
    return "miss";
  }
}
