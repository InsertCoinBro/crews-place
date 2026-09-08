import test from "node:test";
import assert from "node:assert/strict";
import { BubbleRound } from "../games/bubble-pop/state.js";
import {
  MemoryRound,
  MEMORY_SETTINGS,
  shuffledDeck,
} from "../games/memory-hop/state.js";
import { RocketCampaign, ROCKET_LEVELS } from "../games/rocket-flyer/state.js";
const dwell = (round) => round.tick(MEMORY_SETTINGS.dwellSeconds + 0.01);
function moveTo(round, index) {
  while (round.current !== index) {
    const col = round.current % 6,
      row = Math.floor(round.current / 6),
      tc = index % 6,
      tr = Math.floor(index / 6);
    assert.ok(
      round.move(
        col === tc ? 0 : Math.sign(tc - col),
        col === tc ? Math.sign(tr - row) : 0,
      ),
    );
    round.land();
  }
}
test("Bubble Pop counts each bubble once, caps at 100, and celebrates before exit", () => {
  const r = new BubbleRound(),
    bubble = {};
  assert.ok(r.pop(bubble));
  assert.equal(r.pop(bubble), false);
  for (let i = 1; i < 100; i++) r.pop({});
  assert.equal(r.count, 100);
  assert.equal(r.pop({}), false);
  assert.equal(r.tick(1), false);
  assert.equal(r.tick(2), true);
});
test("Every memory deck has exactly 24 tiles / 12 pairs and reshuffles", () => {
  const deck = shuffledDeck();
  assert.equal(deck.length, 24);
  assert.equal(new Set(deck).size, 12);
  for (const id of new Set(deck))
    assert.equal(deck.filter((x) => x === id).length, 2);
  const previous = shuffledDeck(() => 0.5),
    next = shuffledDeck(() => 0.5, previous);
  assert.notDeepEqual(previous, next);
});
test("Memory preview lasts six seconds and blocks moves and reveals", () => {
  const r = new MemoryRound();
  assert.equal(r.move(1, 0), false);
  r.tick(5.9);
  assert.equal(r.phase, "preview");
  assert.ok(r.tiles.every((t) => !t.revealed));
  r.tick(0.11);
  assert.equal(r.phase, "playing");
  assert.equal(r.tick(0.7), null);
  assert.equal(r.tick(0.11), "reveal");
});
test("Moving cancels dwell; passing over a square does not reveal it", () => {
  const r = new MemoryRound();
  r.tick(6);
  r.tick(0.65);
  assert.ok(r.move(1, 0));
  r.tick(3);
  assert.equal(r.dwell, 0);
  assert.equal(r.tiles[0].revealed, false);
  r.land();
  r.tick(0.7);
  assert.equal(r.tiles[1].revealed, false);
  r.tick(0.11);
  assert.equal(r.tiles[1].revealed, true);
});
test("Mismatches turn down after the configured delay and do not re-trigger underfoot", () => {
  const r = new MemoryRound();
  r.tick(6);
  dwell(r);
  const other = r.tiles.findIndex((t) => t.pair !== r.tiles[0].pair);
  moveTo(r, other);
  assert.equal(dwell(r), "miss");
  r.tick(1);
  assert.equal(r.phase, "mismatch");
  r.tick(0.2);
  assert.equal(r.phase, "playing");
  assert.equal(r.first, null);
  r.tick(5);
  assert.equal(r.tiles[other].revealed, false);
});
test("A tile cannot match itself; all pairs can be solved through adjacent moves", () => {
  const r = new MemoryRound();
  r.tick(6);
  dwell(r);
  r.tick(5);
  assert.equal(r.pairs, 0);
  const ids = [...new Set(r.tiles.map((t) => t.pair))];
  for (const id of ids) {
    const pair = r.tiles
      .map((t, i) => (t.pair === id ? i : -1))
      .filter((i) => i >= 0);
    if (r.first === null) {
      moveTo(r, pair[0]);
      dwell(r);
    }
    moveTo(r, pair[1]);
    dwell(r);
  }
  assert.equal(r.pairs, 12);
  assert.equal(r.phase, "complete");
  assert.ok(r.tiles.every((t) => t.matched));
  const previous = r.tiles.map((t) => t.pair);
  r.reset();
  assert.equal(r.phase, "preview");
  assert.equal(r.pairs, 0);
  assert.notDeepEqual(
    r.tiles.map((t) => t.pair),
    previous,
  );
});
test("Rocket campaign advances all ten levels only after 50 unique diamonds", () => {
  const c = new RocketCampaign();
  for (let level = 1; level <= 10; level++) {
    assert.equal(c.level, level);
    assert.equal(c.health, 3);
    const entity = {};
    assert.ok(c.collect(entity));
    assert.equal(c.collect(entity), false);
    for (let i = 1; i < 50; i++) c.collect({});
    assert.equal(c.diamonds, 50);
    assert.equal(c.collect({}), false);
    if (level < 10) {
      assert.equal(c.phase, "level-clear");
      c.tick(2.01);
      assert.equal(c.diamonds, 0);
    } else assert.equal(c.phase, "complete");
  }
  c.restart();
  assert.equal(c.level, 1);
  assert.equal(c.phase, "playing");
});
test("Rocket shield protects between hits and retry keeps the current level", () => {
  const c = new RocketCampaign();
  c.level = 6;
  c.resetLevel();
  assert.equal(c.hit(), false);
  c.tick(2.1);
  assert.ok(c.hit());
  assert.equal(c.health, 2);
  assert.equal(c.hit(), false);
  c.tick(2.1);
  c.hit();
  c.tick(2.1);
  c.hit();
  assert.equal(c.phase, "failed");
  assert.equal(c.health, 0);
  c.retry();
  assert.equal(c.level, 6);
  assert.equal(c.health, 3);
  assert.equal(c.diamonds, 0);
});
test("Rocket level progression is modest and keeps the requested goals", () => {
  assert.equal(ROCKET_LEVELS.length, 10);
  ROCKET_LEVELS.forEach((s, i) => {
    assert.equal(s.diamonds, 50);
    assert.equal(s.health, 3);
    if (i) {
      assert.ok(s.speed - ROCKET_LEVELS[i - 1].speed < 0.3);
      assert.ok(s.obstacleEvery > 1.8);
      assert.ok(s.alienDrift - ROCKET_LEVELS[i - 1].alienDrift < 0.07);
    }
  });
});
