import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const vendor = join(process.cwd(), "public", "vendor", "littlejs");
const read = (...parts) => readFileSync(join(vendor, ...parts), "utf8");

test("downloaded arcade games have every local runtime dependency", () => {
  const required = [
    "LICENSE",
    "SOURCE.md",
    "crew-bridge.js",
    "games/matchThree.html",
    "games/miniGolf.html",
    "games/pillars.html",
    "games/brickout.html",
    "games/homerDerby.html",
    "games/skiing.html",
    "games/freeThrow.html",
    "templates/engineLoader.js",
    "templates/gameFx.js",
    "templates/menus.js",
    "templates/textureGenerator.js",
    "dist/littlejs.js",
    "dist/littlejs.min.js",
    "dist/littlejs.release.js",
    "dist/box2d.wasm.js",
    "dist/box2d.wasm.wasm",
  ];
  for (const file of required)
    assert.ok(statSync(join(vendor, file)).size > 0, `${file} is missing`);
});

test("embedded games use Crew's Place names and lifecycle bridge", () => {
  const bridge = read("crew-bridge.js");
  const games = [
    [read("games", "matchThree.html"), "Gem Garden"],
    [read("games", "miniGolf.html"), "Crew's Putt-Putt"],
    [read("games", "pillars.html"), "Tower Builder"],
    [read("games", "brickout.html"), "Brick Out"],
    [read("games", "homerDerby.html"), "Home Run Derby"],
    [read("games", "skiing.html"), "Downhill Ski"],
    [read("games", "freeThrow.html"), "Free Throw"],
  ];
  for (const [html, title] of games) {
    assert.match(
      html,
      new RegExp(`<title>${title.replace("'", "\\'")}</title>`),
    );
    const lifecycle = html + bridge;
    assert.match(lifecycle, /crewArcadeReady/);
    assert.match(lifecycle, /crewArcadeExit/);
    assert.match(lifecycle, /crewArcadePause/);
    assert.match(lifecycle, /crewArcadeResume/);
    assert.match(lifecycle, /crewArcadeMute/);
    assert.match(lifecycle, /crewArcadeKey/);
    assert.match(html, /ljs-menu-toolbar/);
    assert.doesNotMatch(html, /https?:\/\//);
  }
});

test("Free Throw is untimed and Downhill Ski uses a gentle retry", () => {
  const freeThrow = read("games", "freeThrow.html");
  assert.match(freeThrow, /Untimed practice/);
  assert.match(freeThrow, /UNTIMED PRACTICE/);
  assert.doesNotMatch(freeThrow, /timeLeft = max\(0, timeLeft - timeDelta\)/);
  assert.match(read("games", "skiing.html"), /NICE RUN!/);
});

test("source record pins the downloaded upstream commit and MIT license", () => {
  assert.match(read("SOURCE.md"), /0cbf5fe8713d02b453c8f210c686c633f55f149d/);
  assert.match(read("LICENSE"), /MIT License/);
});
