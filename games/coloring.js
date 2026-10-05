import { floodFill, cleanLineArt, hexToRgb } from "./coloring-fill.js";

// Coloring Corner — the Recreation Club's creative table. A calm, no-fail
// coloring activity: pick a picture, pick a color, tap a region to fill it.
// Follows the LibraryReader overlay pattern (own DOM, own game mode).

const SIZE = 600;
const INK = "#232323";

const PALETTE = [
  ["#e23b3b", "Red"],
  ["#f27d2a", "Orange"],
  ["#f2c230", "Yellow"],
  ["#7bc950", "Green"],
  ["#2a9d8f", "Teal"],
  ["#3b8de2", "Blue"],
  ["#7b5fd0", "Purple"],
  ["#e25fb0", "Pink"],
  ["#a06a35", "Brown"],
  ["#232323", "Black"],
];

function ink(ctx) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawHouse(ctx) {
  circle(ctx, 485, 105, 42);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(485 + Math.cos(a) * 54, 105 + Math.sin(a) * 54);
    ctx.lineTo(485 + Math.cos(a) * 74, 105 + Math.sin(a) * 74);
    ctx.stroke();
  }
  circle(ctx, 105, 110, 28);
  circle(ctx, 140, 100, 36);
  circle(ctx, 175, 112, 26);
  ctx.strokeRect(215, 295, 170, 165);
  ctx.beginPath();
  ctx.moveTo(195, 295);
  ctx.lineTo(300, 195);
  ctx.lineTo(405, 295);
  ctx.closePath();
  ctx.stroke();
  ctx.strokeRect(345, 215, 28, 55);
  circle(ctx, 300, 252, 18);
  ctx.strokeRect(278, 375, 44, 85);
  ctx.strokeRect(232, 325, 42, 42);
  ctx.beginPath();
  ctx.moveTo(253, 325);
  ctx.lineTo(253, 367);
  ctx.moveTo(232, 346);
  ctx.lineTo(274, 346);
  ctx.stroke();
  circle(ctx, 312, 420, 4);
  for (const fx of [120, 480]) {
    ctx.beginPath();
    ctx.moveTo(fx, 540);
    ctx.lineTo(fx, 470);
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
      circle(ctx, fx + Math.cos(a) * 18, 452 + Math.sin(a) * 18, 12);
    }
    circle(ctx, fx, 452, 10);
    ctx.beginPath();
    ctx.ellipse(fx + 22, 505, 18, 9, 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawFlower(ctx) {
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.ellipse(300 + Math.cos(a) * 62, 195 + Math.sin(a) * 62, 34, 22, a, 0, Math.PI * 2);
    ctx.stroke();
  }
  circle(ctx, 300, 195, 30);
  circle(ctx, 300, 195, 12);
  ctx.beginPath();
  ctx.moveTo(300, 225);
  ctx.quadraticCurveTo(295, 340, 300, 500);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(258, 360, 34, 15, -0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(344, 420, 34, 15, 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(452, 140, 10, 26, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(452 + s * 30, 128, 26, 18, s * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(452 + s * 26, 158, 18, 13, s * -0.4, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const gx of [90, 180, 420, 510]) {
    for (const o of [-14, 0, 14]) {
      ctx.beginPath();
      ctx.moveTo(gx + o, 545);
      ctx.quadraticCurveTo(gx + o + 6, 515, gx + o + 12, 505);
      ctx.stroke();
    }
  }
  for (const [fx, fy] of [[130, 420], [480, 400]]) {
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
      circle(ctx, fx + Math.cos(a) * 14, fy + Math.sin(a) * 14, 10);
    }
    circle(ctx, fx, fy, 8);
    ctx.beginPath();
    ctx.moveTo(fx, fy + 18);
    ctx.lineTo(fx, fy + 60);
    ctx.stroke();
  }
}

function drawRocket(ctx) {
  ctx.beginPath();
  ctx.moveTo(270, 360);
  ctx.lineTo(270, 220);
  ctx.quadraticCurveTo(270, 140, 300, 140);
  ctx.quadraticCurveTo(330, 140, 330, 220);
  ctx.lineTo(330, 360);
  ctx.closePath();
  ctx.stroke();
  circle(ctx, 300, 235, 24);
  circle(ctx, 300, 235, 12);
  ctx.beginPath();
  ctx.moveTo(270, 300);
  ctx.lineTo(228, 380);
  ctx.lineTo(270, 360);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(330, 300);
  ctx.lineTo(372, 380);
  ctx.lineTo(330, 360);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(280, 360);
  ctx.quadraticCurveTo(270, 420, 300, 455);
  ctx.quadraticCurveTo(330, 420, 320, 360);
  ctx.closePath();
  ctx.stroke();
  circle(ctx, 130, 460, 42);
  ctx.beginPath();
  ctx.ellipse(130, 460, 72, 20, -0.35, 0, Math.PI * 2);
  ctx.stroke();
  star(ctx, 480, 120, 26);
  star(ctx, 120, 130, 20);
  star(ctx, 470, 470, 18);
  star(ctx, 200, 90, 14);
}

const PICTURES = [
  { id: "house", name: "Sunny House", draw: drawHouse },
  { id: "flower", name: "Flower Garden", draw: drawFlower },
  { id: "rocket", name: "Rocket Ship", draw: drawRocket },
];

export class ColoringCorner {
  constructor(game) {
    this.game = game;
    this.picture = 0;
    this.color = PALETTE[0][0];
    this.onClose = null;
    this.snapshot = null;
    this.root = document.createElement("section");
    this.root.id = "coloring";
    this.root.hidden = true;
    this.root.setAttribute("aria-label", "Coloring corner");
    this.root.innerHTML = [
      '<header class="coloring-top"><div><small>CREW\u2019S PLACE / RECREATION CLUB</small>',
      "<h1>Coloring Corner</h1>",
      "<p>Pick a color, then tap part of the picture. There is no wrong way to color.</p></div>",
      '<div class="coloring-actions">',
      '<button id="coloring-clear" class="coloring-button">Start over</button>',
      '<button id="coloring-close" class="coloring-button">Done <kbd>Esc</kbd></button>',
      "</div></header>",
      '<div class="coloring-pictures" role="group" aria-label="Choose a picture">',
      PICTURES.map((p, i) => `<button class="coloring-picture" data-pic="${i}" aria-pressed="${i === 0}">${p.name}</button>`).join(""),
      "</div>",
      '<main class="coloring-stage">',
      `<canvas id="coloring-canvas" width="${SIZE}" height="${SIZE}" aria-label="Coloring picture. Choose a color, then activate a region to fill it."></canvas>`,
      "</main>",
      '<footer class="coloring-palette" role="group" aria-label="Choose a color">',
      PALETTE.map(([hex, name]) => `<button class="coloring-swatch" data-color="${hex}" aria-label="${name}" aria-pressed="${hex === this.color}" style="--swatch:${hex}"></button>`).join(""),
      "</footer>",
    ].join("");
    document.querySelector("#game").append(this.root);
    this.canvas = this.root.querySelector("#coloring-canvas");
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
    this.root.querySelector("#coloring-close").addEventListener("click", () => this.close());
    this.root.querySelector("#coloring-clear").addEventListener("click", () => this.drawPicture());
    this.root.querySelectorAll(".coloring-picture").forEach((btn) => {
      btn.addEventListener("click", () => this.selectPicture(+btn.dataset.pic));
    });
    this.root.querySelectorAll(".coloring-swatch").forEach((btn) => {
      btn.addEventListener("click", () => this.selectColor(btn.dataset.color));
    });
    this.canvas.addEventListener("pointerdown", (e) => this.paint(e));
    window.addEventListener("keydown", (event) => {
      if (!this.onClose) return;
      if (event.code === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.close();
      }
    });
  }
  open(onClose) {
    if (this.onClose) return false;
    this.onClose = onClose || null;
    this.snapshot = { canvasLabel: this.game.canvas.getAttribute("aria-label") };
    this.game.setMode("coloring");
    this.game.ui.showPrompt(null);
    this.game.ui.toastTime = 0;
    document.querySelector("#toast").hidden = true;
    document.body.classList.add("coloring-active");
    this.root.hidden = false;
    this.drawPicture();
    this.game.canvas.setAttribute("aria-label", "Coloring corner. Escape closes the coloring page.");
    this.root.querySelector("#coloring-close").focus();
    return true;
  }
  close() {
    if (!this.onClose) return;
    const done = this.onClose;
    this.onClose = null;
    this.root.hidden = true;
    document.body.classList.remove("coloring-active");
    if (this.snapshot) this.game.canvas.setAttribute("aria-label", this.snapshot.canvasLabel);
    this.snapshot = null;
    this.game.interactions.current = null;
    this.game.interactionCooldown = 0.35;
    this.game.canvas.focus({ preventScroll: true });
    done();
  }
  selectPicture(index) {
    if (index === this.picture) return;
    this.picture = index;
    this.root.querySelectorAll(".coloring-picture").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(+btn.dataset.pic === this.picture));
    });
    this.drawPicture();
  }
  selectColor(hex) {
    this.color = hex;
    this.root.querySelectorAll(".coloring-swatch").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.color === hex));
    });
  }
  drawPicture() {
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ink(ctx);
    PICTURES[this.picture].draw(ctx);
    ctx.restore();
    const image = ctx.getImageData(0, 0, SIZE, SIZE);
    cleanLineArt(image.data);
    ctx.putImageData(image, 0, 0);
  }
  paint(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * SIZE;
    const y = ((event.clientY - rect.top) / rect.height) * SIZE;
    const image = this.ctx.getImageData(0, 0, SIZE, SIZE);
    const [r, g, b] = hexToRgb(this.color);
    if (floodFill(image.data, SIZE, SIZE, x, y, r, g, b) > 0) this.ctx.putImageData(image, 0, 0);
  }
}
