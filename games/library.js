import * as THREE from "three";
import { canvasTexture } from "./shared/art.js";

export const BOOKS = [
  {
    id: "moonlight-backpack",
    title: "The Moonlight Backpack",
    author: "Crew's Place Library",
    color: "#315f86",
    accent: "#ffd66e",
    symbol: "MOON",
    coverLine: "A quiet walk under a friendly sky",
    pages: [
      {
        text: "Mira packed one soft scarf, one tiny snack, and one brave breath.",
        art: "moon",
      },
      {
        text: "The moon made a silver path over every puddle in the lane.",
        art: "puddle",
      },
      {
        text: "When the path became dark, Mira counted five stars and took one more step.",
        art: "stars",
      },
      {
        text: "A porch light blinked hello, and her backpack felt lighter than before.",
        art: "porch",
      },
      {
        text: "Mira learned that a little light can travel with you anywhere.",
        art: "moon",
      },
    ],
  },
  {
    id: "tiny-train",
    title: "The Tiny Train That Waited",
    author: "Crew's Place Library",
    color: "#c95f45",
    accent: "#f4c95d",
    symbol: "TRAIN",
    coverLine: "A patient train finds the best time to go",
    pages: [
      {
        text: "Tiko was a small train with a bright bell and very round wheels.",
        art: "train",
      },
      {
        text: "Big trains rushed by, but Tiko listened to the crossing guard.",
        art: "signal",
      },
      {
        text: "He waited while ducks crossed, then waited while a kite string floated down.",
        art: "ducks",
      },
      {
        text: "At last the track was clear, and Tiko rolled smoothly through town.",
        art: "track",
      },
      {
        text: "Waiting did not make Tiko late. It helped everyone arrive safely.",
        art: "train",
      },
    ],
  },
  {
    id: "garden-sang",
    title: "When the Garden Sang",
    author: "Crew's Place Library",
    color: "#4f8d64",
    accent: "#efb3bf",
    symbol: "BLOOM",
    coverLine: "A backyard song made from growing things",
    pages: [
      {
        text: "Nia heard tap, tap, tap from seeds asleep under the soil.",
        art: "garden",
      },
      {
        text: "Rain played drums on leaves while worms wiggled the bass line.",
        art: "rain",
      },
      {
        text: "A sunflower lifted its face and hummed a warm yellow note.",
        art: "sunflower",
      },
      {
        text: "Nia did not need to sing loudly. She hummed along in her own way.",
        art: "humming",
      },
      {
        text: "The garden kept singing, and Nia knew she belonged in the song.",
        art: "garden",
      },
    ],
  },
  {
    id: "cloud-share",
    title: "The Cloud Who Learned To Share",
    author: "Crew's Place Library",
    color: "#67a8c7",
    accent: "#fff1a8",
    symbol: "CLOUD",
    coverLine: "A fluffy cloud discovers room for everyone",
    pages: [
      {
        text: "Puff was a cloud who liked having the whole blue sky to himself.",
        art: "cloud",
      },
      {
        text: "A small bird asked for shade, and Puff made one soft corner.",
        art: "bird",
      },
      {
        text: "A tired hill asked for rain, and Puff sprinkled silver drops.",
        art: "rain",
      },
      {
        text: "Soon Puff was not smaller. He was part of a bigger sky.",
        art: "sky",
      },
      {
        text: "Sharing gave Puff more places to float and more friends to see.",
        art: "cloud",
      },
    ],
  },
  {
    id: "stair-door",
    title: "The Door Under the Stairs",
    author: "Crew's Place Library",
    color: "#735c9d",
    accent: "#f0d08a",
    symbol: "DOOR",
    coverLine: "A gentle mystery with a cozy answer",
    pages: [
      {
        text: "Under the stairs was a tiny green door with a brass button knob.",
        art: "door",
      },
      {
        text: "Sam knocked once. The door answered with a very polite creak.",
        art: "knob",
      },
      {
        text: "Inside were pillows, picture books, and a lamp shaped like a pear.",
        art: "nook",
      },
      {
        text: "The secret place was not scary. It was quiet enough to think.",
        art: "lamp",
      },
      {
        text: "Sam put a sign on the door: Come in softly, and stay as long as you need.",
        art: "door",
      },
    ],
  },
  {
    id: "pancake-parade",
    title: "The Pancake Parade",
    author: "Crew's Place Library",
    color: "#d68b3a",
    accent: "#9ccf73",
    symbol: "STACK",
    coverLine: "A breakfast march with syrupy surprises",
    pages: [
      {
        text: "On Saturday morning, Papa flipped one pancake too high.",
        art: "pancake",
      },
      {
        text: "It landed on a plate, bounced twice, and rolled toward the door.",
        art: "roll",
      },
      {
        text: "Soon three pancakes, two berries, and a spoon were marching in a line.",
        art: "parade",
      },
      {
        text: "Milo followed with napkins, because parades can be sticky.",
        art: "napkin",
      },
      {
        text: "The pancake parade ended at the table, exactly where breakfast belonged.",
        art: "pancake",
      },
    ],
  },
  {
    id: "brave-lantern",
    title: "The Brave Little Lantern",
    author: "Crew's Place Library",
    color: "#284e57",
    accent: "#f3b454",
    symbol: "LIGHT",
    coverLine: "A small glow helps a big night feel kind",
    pages: [
      {
        text: "Luma was a lantern who glowed softly beside the garden gate.",
        art: "lantern",
      },
      {
        text: "The wind whooshed, and Luma's light shook like jelly.",
        art: "wind",
      },
      {
        text: "A lost beetle saw the glow and buzzed closer.",
        art: "beetle",
      },
      {
        text: "Luma stood steady while the beetle found the rose bush path.",
        art: "path",
      },
      {
        text: "Being brave did not mean shining the brightest. It meant shining enough.",
        art: "lantern",
      },
    ],
  },
  {
    id: "sock-rocket",
    title: "The Sock Rocket",
    author: "Crew's Place Library",
    color: "#476cb8",
    accent: "#f06c78",
    symbol: "ROCKET",
    coverLine: "Laundry day launches an outer-space idea",
    pages: [
      {
        text: "One striped sock slipped from the basket and declared itself a rocket.",
        art: "rocket",
      },
      {
        text: "It blasted past the couch planet and around the lamp moon.",
        art: "space",
      },
      {
        text: "A button astronaut waved from the rug below.",
        art: "button",
      },
      {
        text: "The sock rocket found its twin hiding under a chair.",
        art: "chair",
      },
      {
        text: "Together they landed in the drawer, ready for tomorrow's mission.",
        art: "rocket",
      },
    ],
  },
  {
    id: "quiet-dragon",
    title: "The Quiet Dragon's Day",
    author: "Crew's Place Library",
    color: "#5c956d",
    accent: "#d9c46f",
    symbol: "DRAGON",
    coverLine: "A calm friend finds a calm way to play",
    pages: [
      {
        text: "Dori the dragon liked quiet games and warm stones in the sun.",
        art: "dragon",
      },
      {
        text: "When the castle yard got noisy, Dori took three slow breaths.",
        art: "breath",
      },
      {
        text: "She invited one friend to sort shiny pebbles by color.",
        art: "pebbles",
      },
      {
        text: "More friends came, but everyone used soft voices near the stones.",
        art: "circle",
      },
      {
        text: "Dori's day was not loud or lonely. It was just right.",
        art: "dragon",
      },
    ],
  },
  {
    id: "river-ribbon",
    title: "The River Ribbon",
    author: "Crew's Place Library",
    color: "#2f8f9d",
    accent: "#f6df7d",
    symbol: "RIVER",
    coverLine: "A winding river shows the way home",
    pages: [
      {
        text: "A blue river curled through the meadow like a ribbon on a gift.",
        art: "river",
      },
      {
        text: "Leah followed it past stones, reeds, and one sleepy wooden bridge.",
        art: "bridge",
      },
      {
        text: "The river did not hurry. It bent around every hard place.",
        art: "bend",
      },
      {
        text: "When Leah felt unsure, she watched the water choose the next turn.",
        art: "water",
      },
      {
        text: "By sunset, the river ribbon led her back to a porch and a wave.",
        art: "porch",
      },
    ],
  },
];

export function getBook(id) {
  return BOOKS.find((book) => book.id === id) ?? null;
}

export function pageReadSeconds(text) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(2.8, Math.min(7.5, words * 0.38 + 1.1));
}

function roundedRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

function wrapLines(c, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? line + " " + word : word;
    if (c.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function circle(c, x, y, r, color) {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}

function ellipse(c, x, y, rx, ry, color) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}

function triangle(c, points, color) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(...points[0]);
  points.slice(1).forEach((point) => c.lineTo(...point));
  c.closePath();
  c.fill();
}

function paintCover(canvas, book, compact = false) {
  const c = canvas.getContext("2d");
  c.fillStyle = book.color;
  c.fillRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = "#fff9e8";
  roundedRect(c, 46, 46, canvas.width - 92, canvas.height - 92, 32);
  c.fill();
  c.fillStyle = book.accent;
  roundedRect(
    c,
    72,
    compact ? 315 : 390,
    canvas.width - 144,
    compact ? 450 : 245,
    28,
  );
  c.fill();
  c.fillStyle = book.color;
  roundedRect(c, 72, 72, canvas.width - 144, compact ? 225 : 270, 24);
  c.fill();
  c.fillStyle = "#fff9e8";
  c.font = compact ? "900 60px sans-serif" : "900 72px sans-serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(
    book.symbol,
    canvas.width / 2,
    compact ? 190 : 225,
    canvas.width - 180,
  );
  c.fillStyle = "#173f42";
  c.font = compact ? "900 70px sans-serif" : "900 58px sans-serif";
  const lines = wrapLines(c, book.title.toUpperCase(), canvas.width - 130);
  lines
    .slice(0, 4)
    .forEach((text, i) =>
      c.fillText(
        text,
        canvas.width / 2,
        compact ? 405 + i * 78 : 485 + i * 65,
        canvas.width - 118,
      ),
    );
  if (!compact) {
    c.font = "800 25px sans-serif";
    c.fillStyle = "#315a5b";
    c.fillText(
      book.coverLine,
      canvas.width / 2,
      canvas.height - 78,
      canvas.width - 90,
    );
  }
}

export function bookCoverTexture(book) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 1024;
  paintCover(canvas, book, true);
  return canvasTexture(canvas);
}

function makeCoverImage(book) {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 940;
  paintCover(canvas, book);
  canvas.className = "reader-cover-art";
  return canvas;
}

function drawFriendlyScene(c, book, page) {
  const w = c.canvas.width;
  const h = c.canvas.height;
  c.fillStyle = "#fff8df";
  c.fillRect(0, 0, w, h);
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, book.accent);
  sky.addColorStop(0.62, "#f8edbf");
  sky.addColorStop(1, "#d7e8c6");
  c.fillStyle = sky;
  roundedRect(c, 28, 28, w - 56, h - 56, 34);
  c.fill();
  c.fillStyle = "#fff9e8cc";
  for (let i = 0; i < 5; i++)
    circle(c, 120 + i * 150, 86 + (i % 2) * 54, 24, "#fff9e8aa");
  c.fillStyle = "#7fb174";
  c.beginPath();
  c.moveTo(28, h - 150);
  c.bezierCurveTo(240, h - 220, 430, h - 90, w - 28, h - 166);
  c.lineTo(w - 28, h - 28);
  c.lineTo(28, h - 28);
  c.closePath();
  c.fill();

  const art = page.art;
  if (["moon", "stars", "puddle"].includes(art)) {
    c.fillStyle = "#2f4f79";
    c.fillRect(28, 28, w - 56, h - 250);
    circle(c, w - 170, 150, 74, "#ffe596");
    circle(c, w - 138, 130, 74, "#2f4f79");
    for (let i = 0; i < 16; i++)
      circle(
        c,
        90 + ((i * 113) % 660),
        78 + ((i * 61) % 280),
        4 + (i % 3),
        "#fff8c9",
      );
    ellipse(c, 300, h - 145, 190, 34, "#9fd7db");
  } else if (["train", "signal", "track", "ducks"].includes(art)) {
    c.fillStyle = "#6c5943";
    c.fillRect(100, h - 155, w - 200, 18);
    for (let i = 0; i < 8; i++) c.fillRect(112 + i * 82, h - 186, 18, 80);
    c.fillStyle = book.color;
    roundedRect(c, 250, h - 330, 340, 150, 24);
    c.fill();
    c.fillStyle = "#f8fbf1";
    roundedRect(c, 300, h - 300, 86, 60, 12);
    c.fill();
    circle(c, 330, h - 174, 42, "#273f45");
    circle(c, 510, h - 174, 42, "#273f45");
    c.fillStyle = "#d84e45";
    c.fillRect(650, h - 390, 30, 210);
    circle(c, 665, h - 415, 42, "#f2d45f");
  } else if (["garden", "sunflower", "humming", "rain"].includes(art)) {
    circle(c, 670, 115, 70, "#ffd35f");
    for (let i = 0; i < 8; i++) {
      const x = 120 + i * 85;
      c.strokeStyle = "#3f7c4d";
      c.lineWidth = 12;
      c.beginPath();
      c.moveTo(x, h - 120);
      c.lineTo(x, h - 260 - (i % 3) * 22);
      c.stroke();
      circle(c, x, h - 285 - (i % 3) * 22, 38, i % 2 ? book.accent : "#f8cf58");
      circle(c, x, h - 285 - (i % 3) * 22, 16, "#7a5338");
    }
  } else if (["cloud", "bird", "sky"].includes(art)) {
    for (const [x, y, s] of [
      [250, 190, 1],
      [525, 260, 0.9],
    ]) {
      ellipse(c, x, y, 115 * s, 58 * s, "#fffaf0");
      circle(c, x - 72 * s, y, 50 * s, "#fffaf0");
      circle(c, x, y - 42 * s, 62 * s, "#fffaf0");
      circle(c, x + 76 * s, y, 48 * s, "#fffaf0");
    }
    c.strokeStyle = book.color;
    c.lineWidth = 12;
    c.beginPath();
    c.arc(430, 360, 32, 0.1, Math.PI - 0.1);
    c.arc(500, 360, 32, 0.1, Math.PI - 0.1);
    c.stroke();
  } else if (["door", "knob", "nook", "lamp"].includes(art)) {
    c.fillStyle = "#caa16e";
    roundedRect(c, 285, 145, 250, 360, 26);
    c.fill();
    c.fillStyle = book.color;
    roundedRect(c, 318, 180, 184, 292, 18);
    c.fill();
    circle(c, 465, 330, 15, "#f4d16b");
    c.fillStyle = "#ffe49b";
    c.fillRect(120, 385, 130, 86);
    triangle(
      c,
      [
        [185, 260],
        [112, 385],
        [258, 385],
      ],
      "#f4c65e",
    );
  } else if (["pancake", "roll", "parade", "napkin"].includes(art)) {
    for (let i = 0; i < 4; i++)
      ellipse(c, 420, h - 155 - i * 38, 170, 48, "#d9954d");
    ellipse(c, 420, h - 292, 132, 34, "#f1c876");
    circle(c, 344, h - 320, 26, "#b64c61");
    circle(c, 486, h - 316, 24, "#b64c61");
    c.strokeStyle = "#8a5a35";
    c.lineWidth = 12;
    c.beginPath();
    c.moveTo(210, h - 90);
    c.bezierCurveTo(310, h - 35, 520, h - 35, 630, h - 90);
    c.stroke();
  } else if (["lantern", "wind", "beetle", "path"].includes(art)) {
    c.fillStyle = "#314f55";
    c.fillRect(28, 28, w - 56, h - 56);
    circle(c, 412, 300, 180, "#f7c85b44");
    c.strokeStyle = "#f3b454";
    c.lineWidth = 18;
    c.strokeRect(340, 195, 145, 205);
    c.fillStyle = "#ffe29a";
    roundedRect(c, 365, 230, 95, 140, 18);
    c.fill();
    circle(c, 590, 430, 30, "#6ccf76");
    c.strokeStyle = "#263f45";
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(575, 430);
    c.lineTo(545, 405);
    c.moveTo(603, 430);
    c.lineTo(634, 405);
    c.stroke();
  } else if (["rocket", "space", "button", "chair"].includes(art)) {
    c.fillStyle = "#263d70";
    c.fillRect(28, 28, w - 56, h - 56);
    for (let i = 0; i < 22; i++)
      circle(
        c,
        80 + ((i * 97) % 700),
        70 + ((i * 53) % 470),
        3 + (i % 3),
        "#fff6bf",
      );
    c.save();
    c.translate(420, 330);
    c.rotate(-0.35);
    ellipse(c, 0, 0, 65, 150, "#f8fbf1");
    triangle(
      c,
      [
        [-58, -72],
        [0, -205],
        [58, -72],
      ],
      book.accent,
    );
    circle(c, 0, -42, 34, "#8bd4dc");
    triangle(
      c,
      [
        [-50, 65],
        [-120, 145],
        [-45, 132],
      ],
      "#79c5b6",
    );
    triangle(
      c,
      [
        [50, 65],
        [120, 145],
        [45, 132],
      ],
      "#79c5b6",
    );
    triangle(
      c,
      [
        [-30, 145],
        [0, 230],
        [30, 145],
      ],
      "#ffbe55",
    );
    c.restore();
  } else if (["dragon", "breath", "pebbles", "circle"].includes(art)) {
    ellipse(c, 430, 350, 190, 115, book.color);
    circle(c, 270, 300, 86, book.color);
    triangle(
      c,
      [
        [205, 242],
        [230, 150],
        [275, 240],
      ],
      book.accent,
    );
    triangle(
      c,
      [
        [515, 235],
        [560, 140],
        [600, 260],
      ],
      book.accent,
    );
    circle(c, 246, 288, 12, "#173f42");
    circle(c, 310, 288, 12, "#173f42");
    for (let i = 0; i < 9; i++)
      circle(
        c,
        170 + i * 68,
        h - 92,
        18,
        ["#f2c45e", "#78a3c9", "#d78395"][i % 3],
      );
  } else {
    c.strokeStyle = book.color;
    c.lineWidth = 44;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(85, 360);
    c.bezierCurveTo(220, 240, 330, 520, 470, 390);
    c.bezierCurveTo(580, 290, 640, 415, 735, 330);
    c.stroke();
    c.fillStyle = "#8a6b4d";
    c.fillRect(315, 275, 250, 30);
    c.fillRect(340, 305, 26, 120);
    c.fillRect(515, 305, 26, 120);
  }

  c.strokeStyle = "#fffaf0";
  c.lineWidth = 14;
  roundedRect(c, 28, 28, w - 56, h - 56, 34);
  c.stroke();
}

function makePicture(book, page) {
  const picture = document.createElement("canvas");
  picture.width = 900;
  picture.height = 650;
  picture.className = "book-picture";
  picture.dataset.art = page.art;
  drawFriendlyScene(picture.getContext("2d"), book, page);
  return picture;
}

export class LibraryReader {
  constructor(game) {
    this.game = game;
    this.book = null;
    this.page = 0;
    this.reading = false;
    this.timer = 0;
    this.snapshot = null;
    this.root = document.createElement("section");
    this.root.id = "library-reader";
    this.root.hidden = true;
    this.root.setAttribute("aria-label", "Library book reader");
    this.root.innerHTML =
      '<header class="reader-top"><div><small>CREW’S PLACE / LITTLE LIBRARY</small><h1 id="reader-title"></h1><p id="reader-author"></p></div><div class="reader-actions"><button id="reader-read" class="reader-button">Read aloud</button><button id="reader-close" class="reader-button">Close Book <kbd>Esc</kbd></button></div></header><main class="reader-stage" aria-live="polite"><button id="reader-prev" class="reader-turn" aria-label="Previous page">‹</button><article id="reader-book" class="reader-book"></article><button id="reader-next" class="reader-turn" aria-label="Next page">›</button></main><footer class="reader-footer"><span id="reader-page-count"></span><div class="reader-dots" id="reader-dots"></div></footer>';
    document.querySelector("#game").append(this.root);
    this.root
      .querySelector("#reader-close")
      .addEventListener("click", () => this.close());
    this.root
      .querySelector("#reader-prev")
      .addEventListener("click", () => this.previous());
    this.root
      .querySelector("#reader-next")
      .addEventListener("click", () => this.next());
    this.root
      .querySelector("#reader-read")
      .addEventListener("click", () => this.toggleReadAloud());
    window.addEventListener("keydown", (event) => {
      if (!this.book) return;
      if (event.code === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.close();
      } else if (event.code === "ArrowLeft") {
        event.preventDefault();
        this.previous();
      } else if (event.code === "ArrowRight") {
        event.preventDefault();
        this.next();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.stopReading();
    });
  }

  open(bookId) {
    const book = getBook(bookId);
    if (!book || this.book || this.game.area.id !== "library") return false;
    this.snapshot = {
      canvasLabel: this.game.canvas.getAttribute("aria-label"),
    };
    this.book = book;
    this.page = 0;
    this.game.setMode("reading");
    this.game.ui.showPrompt(null);
    this.game.ui.toastTime = 0;
    document.querySelector("#toast").hidden = true;
    document.body.classList.add("library-active");
    this.root.hidden = false;
    this.render();
    this.game.canvas.setAttribute(
      "aria-label",
      book.title + ". Arrow keys turn pages. Escape closes the book.",
    );
    this.root.querySelector("#reader-next").focus();
    return true;
  }

  close() {
    if (!this.book) return;
    this.stopReading();
    this.book = null;
    this.root.hidden = true;
    document.body.classList.remove("library-active");
    if (this.snapshot)
      this.game.canvas.setAttribute("aria-label", this.snapshot.canvasLabel);
    this.snapshot = null;
    this.game.interactions.current = null;
    this.game.interactionCooldown = 0.35;
    this.game.setMode("playing");
    this.game.canvas.focus({ preventScroll: true });
    this.game.ui.toast("Back in the Little Library.");
  }

  next(auto = false) {
    if (!this.book) return;
    if (this.page < this.book.pages.length) {
      this.page += 1;
      this.render("next");
      if (this.reading) this.speakCurrent();
    } else if (auto) {
      this.stopReading();
    }
  }

  previous() {
    if (!this.book || this.page === 0) return;
    this.page -= 1;
    this.render("previous");
    if (this.reading) this.speakCurrent();
  }

  toggleReadAloud() {
    if (!this.book) return;
    if (this.reading) this.stopReading();
    else {
      this.reading = true;
      this.root.querySelector("#reader-read").textContent = "Stop reading";
      this.speakCurrent();
    }
  }

  stopReading() {
    this.reading = false;
    clearTimeout(this.timer);
    this.timer = 0;
    window.speechSynthesis?.cancel?.();
    this.root.querySelector("#reader-read").textContent = "Read aloud";
  }

  speakCurrent() {
    if (!this.book || !this.reading) return;
    clearTimeout(this.timer);
    window.speechSynthesis?.cancel?.();
    const text =
      this.page === 0
        ? `${this.book.title}. ${this.book.coverLine}.`
        : this.book.pages[this.page - 1].text;
    const done = () => {
      if (this.reading) this.next(true);
    };
    if ("speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.86;
      utterance.pitch = 1.06;
      utterance.onend = done;
      utterance.onerror = () => {
        this.timer = setTimeout(done, pageReadSeconds(text) * 1000);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      this.timer = setTimeout(done, pageReadSeconds(text) * 1000);
    }
  }

  render(direction = "next") {
    const title = this.root.querySelector("#reader-title");
    const author = this.root.querySelector("#reader-author");
    const bookNode = this.root.querySelector("#reader-book");
    title.textContent = this.book.title;
    author.textContent = this.book.author;
    bookNode.className = "reader-book page-" + direction;
    bookNode.replaceChildren();
    if (this.page === 0) {
      bookNode.append(makeCoverImage(this.book));
      const coverText = document.createElement("div");
      coverText.className = "reader-cover-copy";
      const strong = document.createElement("strong");
      strong.textContent = this.book.title;
      const line = document.createElement("span");
      line.textContent = this.book.coverLine;
      coverText.append(strong, line);
      bookNode.append(coverText);
    } else {
      const page = this.book.pages[this.page - 1];
      bookNode.append(makePicture(this.book, page));
      const text = document.createElement("p");
      text.className = "reader-page-text";
      text.textContent = page.text;
      bookNode.append(text);
    }
    const total = this.book.pages.length + 1;
    this.root.querySelector("#reader-page-count").textContent =
      this.page === 0
        ? "Cover"
        : `Page ${this.page} of ${this.book.pages.length}`;
    this.root.querySelector("#reader-prev").disabled = this.page === 0;
    this.root.querySelector("#reader-next").disabled = this.page === total - 1;
    const dots = this.root.querySelector("#reader-dots");
    dots.replaceChildren();
    for (let i = 0; i < total; i++) {
      const dot = document.createElement("span");
      dot.className = i === this.page ? "active" : "";
      dots.append(dot);
    }
  }
}
