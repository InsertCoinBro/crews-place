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
        text: "Mira packed one soft scarf that smelled like lavender, one tiny honey snack, and one brave breath that puffed out like a little cloud.",
        art: "moon",
      },
      {
        text: "The moon poured a silver path over every puddle in the lane, and each one winked back at her like a secret friend.",
        art: "puddle",
      },
      {
        text: "When the path grew dark between the trees, Mira counted five brave stars — one, two, three, four, five — and her feet remembered how to be brave too.",
        art: "stars",
      },
      {
        text: "A porch light blinked hello through the leaves, warm as a smile, and suddenly her backpack felt lighter than a feather.",
        art: "porch",
      },
      {
        text: "Mira learned that a little light — moonlight, starlight, or the brave kind inside you — can travel with you anywhere you go.",
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
        text: "Tiko was a small train with a bright brass bell that went ting-ting! and wheels so round they hummed a happy song on the rails.",
        art: "train",
      },
      {
        text: "Big express trains thundered past in a blur, but Tiko listened carefully to the crossing guard's whistle and waited, puffing soft white clouds.",
        art: "signal",
      },
      {
        text: "He waited while seven ducks waddled across in a wiggly line, then waited while a red kite string floated down and tickled his chimney.",
        art: "ducks",
      },
      {
        text: "At last the track was clear! Tiko's bell rang ting-ting-ting! and he rolled smoothly through town, waving to everyone he passed.",
        art: "track",
      },
      {
        text: "Waiting did not make Tiko late at all. It helped every duck, every kite, and every friend arrive safely — and that felt better than hurrying.",
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
        text: "Nia pressed her ear to the cool earth and heard it: tap, tap, tap — tiny seeds waking up and knocking softly to come out and play.",
        art: "garden",
      },
      {
        text: "Rain began to play drums on the broad leaves — pitter-patter-pit! — while the worms underground wiggled the wobbly bass line.",
        art: "rain",
      },
      {
        text: "A tall sunflower lifted its golden face to the sun and hummed one warm yellow note that buzzed like honey and felt like a hug.",
        art: "sunflower",
      },
      {
        text: "Nia did not need to sing loudly or perfectly. She hummed along in her own quiet way, and the garden leaned in to listen.",
        art: "humming",
      },
      {
        text: "The garden kept singing its growing song, and Nia knew — deep in her roots — that she belonged in the music.",
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
        text: "Puff was a fluffy white cloud who loved having the whole wide blue sky all to himself, drifting wherever the breeze tickled him.",
        art: "cloud",
      },
      {
        text: "A tiny tired bird asked, “Please, may I rest in your shade?” And Puff stretched out one soft, cool corner just for her.",
        art: "bird",
      },
      {
        text: "A thirsty green hill whispered, “I’m so dry,” so Puff sprinkled silver raindrops that went plink-plink-plink on the leaves.",
        art: "rain",
      },
      {
        text: "Puff didn’t feel smaller at all. He felt like part of something bigger — a sky full of friends.",
        art: "sky",
      },
      {
        text: "Sharing gave Puff more places to float, more songs to hear, and more friends waving up at him from below.",
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
        text: "Under the stairs, half-hidden behind the winter coats, was a tiny green door with a brass knob shaped like a button.",
        art: "door",
      },
      {
        text: "Sam knocked once — knock-knock — and the door answered with the most polite little creak, as if it had been waiting to say hello.",
        art: "knob",
      },
      {
        text: "Inside was the coziest nook: squishy pillows, a stack of picture books, and a lamp shaped like a glowing pear.",
        art: "nook",
      },
      {
        text: "The secret place wasn’t scary at all. It was quiet enough to think big thoughts and soft enough to feel safe.",
        art: "lamp",
      },
      {
        text: "Sam hung a hand-drawn sign on the door: “Come in softly, and stay as long as you need. — Sam.”",
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
        text: "On Saturday morning, Papa flipped one pancake a little too high — whoosh! — and everyone gasped.",
        art: "pancake",
      },
      {
        text: "It landed on a plate with a plop, bounced twice like a trampoline, and rolled merrily toward the door.",
        art: "roll",
      },
      {
        text: "Soon three fluffy pancakes, two giggling blueberries, and one brave spoon were marching in a wiggly line across the kitchen.",
        art: "parade",
      },
      {
        text: "Milo marched behind with a stack of napkins, because everyone knows parades can be deliciously sticky.",
        art: "napkin",
      },
      {
        text: "The pancake parade marched right to the table and stopped — exactly where breakfast belonged, with syrup for everyone.",
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
        text: "Luma was a small paper lantern who glowed softly beside the garden gate, humming a tiny warm light.",
        art: "lantern",
      },
      {
        text: "The night wind whooshed through the trees — whooo! — and Luma’s light wobbled like jelly, but it did not go out.",
        art: "wind",
      },
      {
        text: "A tiny lost beetle saw the warm glow and buzzed closer, his wings going bzz-bzz-bzz with relief.",
        art: "beetle",
      },
      {
        text: "Luma stood as steady as she could while the beetle followed her light all the way to the rose bush path home.",
        art: "path",
      },
      {
        text: "Luma learned that being brave doesn’t mean shining the brightest. It means shining just enough, for just long enough, for someone who needs you.",
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
        text: "One stripy sock slipped from the laundry basket, pointed its toe at the ceiling, and declared: “I am a ROCKET!”",
        art: "rocket",
      },
      {
        text: "It blasted past the big squashy couch planet — whoosh! — looped around the glowing lamp moon, and did a barrel roll over the rug.",
        art: "space",
      },
      {
        text: "A brave button astronaut waved from the rug below, shouting “Godspeed, Sock Rocket!” in a tiny button voice.",
        art: "button",
      },
      {
        text: "Behind the armchair, the sock rocket discovered its long-lost twin, who had been hiding there since Tuesday.",
        art: "chair",
      },
      {
        text: "Together they zoomed back and landed softly in the drawer, side by side, already dreaming of tomorrow’s mission to the closet nebula.",
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
        text: "Dori the dragon loved quiet games, warm sun-toasted stones, and the soft shhhh of wind through the castle garden.",
        art: "dragon",
      },
      {
        text: "When the castle yard got too noisy and clangy, Dori closed her eyes and took three slow dragon breaths: in… out… in… out…",
        art: "breath",
      },
      {
        text: "She invited one good friend to sit on the warm stones and sort shiny pebbles by color — reds here, blues there, sparkly ones in the middle.",
        art: "pebbles",
      },
      {
        text: "More friends wandered over, but everyone used soft voices near the stones, because quiet games are best played gently.",
        art: "circle",
      },
      {
        text: "Dori’s day wasn’t loud or lonely or too much. It was calm and cozy and exactly the right size — just like Dori liked it.",
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
        text: "A blue river curled through the meadow like a satin ribbon on a birthday gift, sparkling where the sun kissed it.",
        art: "river",
      },
      {
        text: "Leah followed it past smooth skipping stones, whispering reeds, and one sleepy old wooden bridge that snored softly in the sun.",
        art: "bridge",
      },
      {
        text: "The river never hurried. When it met a hard place, it simply curved around it — gentle and patient, finding a new way.",
        art: "bend",
      },
      {
        text: "When Leah felt unsure about which way to go, she watched the water choose its next turn, and her feet felt braver too.",
        art: "water",
      },
      {
        text: "By sunset, painted pink and gold, the river ribbon had led her all the way back to a porch, a warm wave, and home.",
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

function drawFriendlyScene(c, book, page, time = 0) {
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

  // ---- Living picture: gentle animated magic over every scene ----
  for (let i = 0; i < 14; i++) {
    const sx = 60 + ((i * 173 + time * 22 * (1 + (i % 3) * 0.4)) % (w - 120));
    const sy = 70 + ((i * 211 + Math.sin(time * 0.9 + i) * 26) % (h - 160));
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(time * 1.7 + i * 2.1));
    c.fillStyle = `rgba(255, 252, 230, ${0.55 * tw})`;
    const r = 2.5 + (i % 3);
    c.beginPath();
    c.arc(sx, sy, r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = `rgba(255, 252, 230, ${0.4 * tw})`;
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(sx - r * 2.2, sy);
    c.lineTo(sx + r * 2.2, sy);
    c.moveTo(sx, sy - r * 2.2);
    c.lineTo(sx, sy + r * 2.2);
    c.stroke();
  }
  if (["moon", "stars", "puddle", "lantern", "wind", "beetle", "path"].includes(art)) {
    for (let i = 0; i < 12; i++) {
      const sx = 90 + ((i * 113) % 660);
      const sy = 78 + ((i * 61) % 280);
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * 2.2 + i * 1.7));
      circle(c, sx, sy, (3 + (i % 3)) * (0.7 + 0.5 * tw), `rgba(255, 248, 201, ${tw})`);
    }
  }
}

function makePicture(book, page) {
  const picture = document.createElement("canvas");
  picture.width = 900;
  picture.height = 650;
  picture.className = "book-picture";
  picture.dataset.art = page.art;
  drawFriendlyScene(picture.getContext("2d"), book, page, 0);
  return picture;
}

// Pick the warmest available English storyteller voice. Browser TTS voices
// vary wildly by platform; prefer natural/neural/premium voices, then known
// good built-ins, then any English voice.
let storyVoice = null;
let storyVoiceReady = false;
function pickStoryVoice() {
  if (storyVoiceReady) return storyVoice;
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const voices = synth.getVoices();
  if (!voices.length) return null;
  storyVoiceReady = true;
  const en = voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
  const pool = en.length ? en : voices;
  const score = (v) => {
    const n = (v.name + " " + (v.voiceURI || "")).toLowerCase();
    let s = 0;
    if (/natural|neural|premium|enhanced|high quality/.test(n)) s += 50;
    if (/samantha|karen|moira|tessa|fiona/.test(n)) s += 40;
    if (/google us english|google uk english female/.test(n)) s += 35;
    if (/aria|jenny|guy|davis/.test(n)) s += 30;
    if (/female|samantha|karen|zira|aria|jenny/.test(n)) s += 8;
    if (/^en-us/i.test(v.lang)) s += 5;
    if (v.localService) s += 3;
    if (/whisper|robot|cellos|bubbles|bad|novelty/.test(n)) s -= 60;
    return s;
  };
  pool.sort((a, b) => score(b) - score(a));
  storyVoice = pool[0] || null;
  return storyVoice;
}
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  pickStoryVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    storyVoiceReady = false;
    pickStoryVoice();
  };
}

export class LibraryReader {
  constructor(game) {
    this.game = game;
    this.book = null;
    this.page = 0;
    this.reading = false;
    this.timer = 0;
    this.snapshot = null;
    this.pictureAnim = null;
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
      if (document.hidden) {
        this.stopReading();
        this.stopPictureAnimation();
      }
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
    this.stopPictureAnimation();
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

  startPictureAnimation(canvas, book, page) {
    this.stopPictureAnimation();
    const ctx = canvas.getContext("2d");
    const start = performance.now();
    const tick = () => {
      if (!this.book) return;
      const time = (performance.now() - start) / 1000;
      drawFriendlyScene(ctx, book, page, time);
      this.pictureAnim = requestAnimationFrame(tick);
    };
    this.pictureAnim = requestAnimationFrame(tick);
  }

  stopPictureAnimation() {
    if (this.pictureAnim) {
      cancelAnimationFrame(this.pictureAnim);
      this.pictureAnim = null;
    }
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
      const voice = pickStoryVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 0.94;
      utterance.pitch = 1.02;
      utterance.volume = 1;
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
    this.stopPictureAnimation();
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
      const picture = makePicture(this.book, page);
      bookNode.append(picture);
      this.startPictureAnimation(picture, this.book, page);
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
