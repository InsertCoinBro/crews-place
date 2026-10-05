// Pure flood-fill for the Coloring Corner activity. No DOM, no three.js —
// safe to import in node tests.
//
// The fill treats near-black pixels as outline walls and fills the connected
// region of similarly-colored pixels, with a small tolerance so
// anti-aliased outline edges don't leave a halo.

function isWall(r, g, b) {
  return r < 128 && g < 128 && b < 128;
}

function distSq(data, i, r, g, b) {
  const dr = data[i] - r;
  const dg = data[i + 1] - g;
  const db = data[i + 2] - b;
  return dr * dr + dg * dg + db * db;
}

// Fills the connected region containing (startX, startY) with the given RGB.
// `data` is a Uint8ClampedArray in ImageData layout (RGBA, row-major).
// Returns the number of pixels filled.
export function floodFill(
  data,
  width,
  height,
  startX,
  startY,
  fillR,
  fillG,
  fillB,
) {
  const x0 = Math.floor(startX);
  const y0 = Math.floor(startY);
  if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) return 0;
  const startI = (y0 * width + x0) * 4;
  const sr = data[startI];
  const sg = data[startI + 1];
  const sb = data[startI + 2];
  if (isWall(sr, sg, sb)) return 0;
  if (sr === fillR && sg === fillG && sb === fillB) return 0;

  // Tolerance (squared distance) for "same region": forgiving of anti-aliased
  // edges and paper texture, strict enough to stop at other colors.
  const TOL_SQ = 48 * 48 * 3;
  const matches = (i) => {
    if (isWall(data[i], data[i + 1], data[i + 2])) return false;
    return distSq(data, i, sr, sg, sb) <= TOL_SQ;
  };

  const visited = new Uint8Array(width * height);
  const stack = [[x0, y0]];
  let filled = 0;

  while (stack.length) {
    const [cx, cy] = stack.pop();
    // Scan left to the region's edge.
    let nx = cx;
    while (nx >= 0 && !visited[cy * width + nx]) {
      if (!matches((cy * width + nx) * 4)) break;
      nx--;
    }
    nx++;
    let spanUp = false;
    let spanDown = false;
    // Scan right, filling and queuing the rows above/below.
    while (nx < width && !visited[cy * width + nx]) {
      const i = (cy * width + nx) * 4;
      if (!matches(i)) break;
      data[i] = fillR;
      data[i + 1] = fillG;
      data[i + 2] = fillB;
      data[i + 3] = 255;
      visited[cy * width + nx] = 1;
      filled++;
      if (cy > 0) {
        const up = (cy - 1) * width + nx;
        if (!visited[up] && matches(up * 4)) {
          if (!spanUp) {
            stack.push([nx, cy - 1]);
            spanUp = true;
          }
        } else {
          spanUp = false;
        }
      }
      if (cy < height - 1) {
        const down = (cy + 1) * width + nx;
        if (!visited[down] && matches(down * 4)) {
          if (!spanDown) {
            stack.push([nx, cy + 1]);
            spanDown = true;
          }
        } else {
          spanDown = false;
        }
      }
      nx++;
    }
  }
  return filled;
}

// Snap anti-aliased outline edges to pure white so fills reach the lines
// cleanly. Call once after drawing the line art, before any fills.
export function cleanLineArt(data) {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] > 160 && data[i + 1] > 160 && data[i + 2] > 160) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }
}

// Hex like "#f2a5d0" -> [r, g, b].
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
