import test from "node:test";
import assert from "node:assert/strict";
import { floodFill, cleanLineArt, hexToRgb } from "../games/coloring-fill.js";

// Build a tiny canvas: white field with a black vertical wall down the middle.
function makeField(w, h, draw) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = 255;
    data[i * 4 + 1] = 255;
    data[i * 4 + 2] = 255;
    data[i * 4 + 3] = 255;
  }
  if (draw) draw(data, w, h);
  return data;
}

const blackWall = (data, w, h) => {
  for (let y = 0; y < h; y++) {
    const i = (y * w + Math.floor(w / 2)) * 4;
    data[i] = data[i + 1] = data[i + 2] = 10;
  }
};

const pixel = (data, w, x, y) => {
  const i = (y * w + x) * 4;
  return [data[i], data[i + 1], data[i + 2]];
};

test("fill stays on its side of a wall", () => {
  const w = 10;
  const h = 8;
  const data = makeField(w, h, blackWall);
  const filled = floodFill(data, w, h, 1, 1, 255, 0, 0);
  assert.equal(filled, 5 * 8); // left half only
  assert.deepEqual(pixel(data, w, 0, 0), [255, 0, 0]);
  assert.deepEqual(pixel(data, w, 9, 7), [255, 255, 255]); // right untouched
  assert.deepEqual(pixel(data, w, 5, 3), [10, 10, 10]); // wall intact
});

test("clicking the wall fills nothing", () => {
  const w = 10;
  const h = 8;
  const data = makeField(w, h, blackWall);
  assert.equal(floodFill(data, w, h, 5, 3, 0, 255, 0), 0);
  assert.deepEqual(pixel(data, w, 0, 0), [255, 255, 255]);
});

test("clicking outside the canvas fills nothing", () => {
  const data = makeField(6, 6);
  assert.equal(floodFill(data, 6, 6, -1, 2, 0, 0, 255), 0);
  assert.equal(floodFill(data, 6, 6, 6, 2, 0, 0, 255), 0);
});

test("recoloring a filled region works", () => {
  const w = 10;
  const h = 8;
  const data = makeField(w, h, blackWall);
  floodFill(data, w, h, 1, 1, 255, 0, 0);
  const refilled = floodFill(data, w, h, 2, 2, 0, 0, 255);
  assert.equal(refilled, 5 * 8);
  assert.deepEqual(pixel(data, w, 1, 1), [0, 0, 255]);
});

test("filling with the same color is a no-op", () => {
  const data = makeField(6, 6);
  assert.equal(floodFill(data, 6, 6, 1, 1, 255, 255, 255), 0);
});

test("cleanLineArt lets fills reach the outlines", () => {
  const w = 10;
  const h = 10;
  const data = makeField(w, h, (d, ww, hh) => {
    // 4x4 square: black 1px outline, gray anti-aliased fringe just inside it
    for (let y = 2; y < 8; y++)
      for (let x = 2; x < 8; x++) {
        const i = (y * ww + x) * 4;
        const outline = x === 2 || x === 7 || y === 2 || y === 7;
        const fringe = x === 3 || x === 6 || y === 3 || y === 6;
        const v = outline ? 10 : fringe ? 200 : 255;
        d[i] = d[i + 1] = d[i + 2] = v;
      }
  });
  cleanLineArt(data);
  const filled = floodFill(data, w, h, 4, 4, 0, 200, 0);
  assert.equal(filled, 16); // 4x4 interior, fringe absorbed, outline holds
  assert.deepEqual(pixel(data, w, 3, 3), [0, 200, 0]);
  assert.deepEqual(pixel(data, w, 2, 4), [10, 10, 10]); // outline intact
  assert.deepEqual(pixel(data, w, 0, 0), [255, 255, 255]); // outside untouched
});

test("hexToRgb parses palette colors", () => {
  assert.deepEqual(hexToRgb("#f2a5d0"), [242, 165, 208]);
  assert.deepEqual(hexToRgb("#000000"), [0, 0, 0]);
  assert.deepEqual(hexToRgb("#ffffff"), [255, 255, 255]);
});
