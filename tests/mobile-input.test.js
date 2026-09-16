import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("mobile controls cover movement, camera, actions, and contextual play", () => {
  const controls = read("shared/components/mobile-controls.js");
  for (const code of [
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "KeyE",
    "Space",
    "KeyC",
    "KeyR",
    "Enter",
    "KeyT",
  ])
    assert.match(controls, new RegExp(code));
  assert.match(controls, /addLook/);
  assert.match(controls, /pointercancel/);
  assert.match(controls, /arcade\.current\?\.id !== "derby"/);
});

test("mobile input reaches both native and embedded arcade games", () => {
  const arcade = read("games/arcade.js");
  const embedded = read("games/embedded/game.js");
  const bridge = read("public/vendor/littlejs/crew-bridge.js");
  assert.match(arcade, /current\.virtualKey\?\./);
  assert.match(embedded, /crewArcadeKey/);
  assert.match(bridge, /document\.dispatchEvent/);
  assert.match(bridge, /new KeyboardEvent/);
});

test("phone layout uses dynamic viewport and safe-area insets", () => {
  const html = read("index.html");
  const css = read("styles/main.css");
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(css, /100dvh/);
  assert.match(css, /safe-area-inset-left/);
  assert.match(css, /safe-area-inset-right/);
  assert.match(css, /safe-area-inset-bottom/);
});
