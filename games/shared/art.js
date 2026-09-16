import * as THREE from "three";

// Original, replaceable canvas artwork. No network requests or platform emoji fonts.
export const PAIRS = [
  { id: "cat", label: "CAT", type: "animal", color: "#ffe0ae" },
  { id: "bunny", label: "BUNNY", type: "animal", color: "#f4d5ef" },
  { id: "frog", label: "FROG", type: "animal", color: "#cceba3" },
  { id: "fish", label: "FISH", type: "animal", color: "#b8e7f7" },
  {
    id: "red",
    label: "RED HEART",
    type: "symbol",
    symbol: "♥",
    color: "#ec677c",
  },
  {
    id: "blue",
    label: "BLUE STAR",
    type: "symbol",
    symbol: "★",
    color: "#538edb",
  },
  {
    id: "yellow",
    label: "YELLOW SUN",
    type: "symbol",
    symbol: "☀",
    color: "#edc750",
  },
  { id: "one", label: "ONE", type: "text", symbol: "1", color: "#ccebdc" },
  { id: "two", label: "TWO", type: "text", symbol: "2", color: "#e0d8f4" },
  { id: "three", label: "THREE", type: "text", symbol: "3", color: "#ffdab7" },
  { id: "a", label: "LETTER A", type: "text", symbol: "A", color: "#f4d4de" },
  { id: "b", label: "LETTER B", type: "text", symbol: "B", color: "#cae6ee" },
];
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
  points.slice(1).forEach((p) => c.lineTo(...p));
  c.closePath();
  c.fill();
}
function face(c, id) {
  if (id === "cat") {
    triangle(
      c,
      [
        [137, 198],
        [151, 75],
        [237, 153],
      ],
      "#e49a52",
    );
    triangle(
      c,
      [
        [275, 153],
        [360, 75],
        [374, 198],
      ],
      "#e49a52",
    );
    ellipse(c, 256, 229, 133, 113, "#efa959");
    triangle(
      c,
      [
        [155, 163],
        [161, 113],
        [200, 155],
      ],
      "#ffc9b1",
    );
    triangle(
      c,
      [
        [311, 155],
        [352, 113],
        [356, 163],
      ],
      "#ffc9b1",
    );
    ellipse(c, 230, 264, 33, 24, "#ffedce");
    ellipse(c, 282, 264, 33, 24, "#ffedce");
    triangle(
      c,
      [
        [246, 245],
        [266, 245],
        [256, 259],
      ],
      "#61463b",
    );
    c.strokeStyle = "#704c39";
    c.lineWidth = 7;
    for (const side of [-1, 1])
      for (let i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo(256 + side * 88, 253 + i * 18);
        c.lineTo(256 + side * 139, 249 + i * 26);
        c.stroke();
      }
  } else if (id === "bunny") {
    ellipse(c, 199, 133, 35, 103, "#fff8ef");
    ellipse(c, 313, 133, 35, 103, "#fff8ef");
    ellipse(c, 199, 125, 16, 73, "#e99caf");
    ellipse(c, 313, 125, 16, 73, "#e99caf");
    ellipse(c, 256, 261, 119, 104, "#fff8ef");
    circle(c, 191, 288, 19, "#f5bfca");
    circle(c, 321, 288, 19, "#f5bfca");
    triangle(
      c,
      [
        [246, 279],
        [266, 279],
        [256, 292],
      ],
      "#c67b94",
    );
  } else if (id === "frog") {
    circle(c, 187, 176, 53, "#68ad68");
    circle(c, 325, 176, 53, "#68ad68");
    ellipse(c, 256, 252, 139, 103, "#72b66c");
    for (const x of [187, 325]) {
      circle(c, x, 174, 32, "#fffbea");
      circle(c, x + 6, 174, 15, "#254a47");
    }
    c.strokeStyle = "#315d48";
    c.lineWidth = 10;
    c.lineCap = "round";
    c.beginPath();
    c.arc(256, 253, 64, 0.15, Math.PI - 0.15);
    c.stroke();
  } else {
    triangle(
      c,
      [
        [157, 242],
        [69, 163],
        [69, 323],
      ],
      "#e79547",
    );
    ellipse(c, 277, 243, 131, 96, "#f6b65e");
    triangle(
      c,
      [
        [230, 156],
        [305, 105],
        [330, 165],
      ],
      "#e79547",
    );
    for (let i = 0; i < 3; i++) {
      c.strokeStyle = "#e6994a";
      c.lineWidth = 8;
      c.beginPath();
      c.arc(245 + i * 25, 240, 45, -0.9, 0.9);
      c.stroke();
    }
    circle(c, 339, 218, 22, "#fff8dd");
    circle(c, 343, 218, 11, "#254a47");
  }
  if (id === "cat" || id === "bunny")
    for (const x of [211, 301]) {
      ellipse(c, x, id === "cat" ? 220 : 251, 11, 15, "#334b49");
      circle(c, x + 3, id === "cat" ? 215 : 246, 3, "#fff");
    }
}
export function tileTexture(pair) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const c = canvas.getContext("2d");
  c.fillStyle = pair?.color ?? "#477883";
  c.fillRect(0, 0, 512, 512);
  c.strokeStyle = pair ? "#ffffff9c" : "#ffffff34";
  c.lineWidth = 12;
  c.strokeRect(15, 15, 482, 482);
  if (!pair) {
    c.fillStyle = "#effaf1";
    c.font = "bold 220px sans-serif";
    c.textAlign = "center";
    c.fillText("?", 256, 323);
    return canvasTexture(canvas);
  }
  if (pair.type === "animal") face(c, pair.id);
  else {
    c.fillStyle = pair.type === "symbol" ? "#ffffff" : "#30545b";
    c.font = "bold 260px sans-serif";
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(pair.symbol, 256, 240);
  }
  c.fillStyle = pair.type === "symbol" ? "#ffffff" : "#30545b";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = "bold 40px sans-serif";
  c.fillText(pair.label, 256, 443);
  return canvasTexture(canvas);
}
export function canvasTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export function cabinetTexture(id) {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 460;
  const c = canvas.getContext("2d");
  const bg = c.createLinearGradient(0, 0, 600, 460);
  const colors = {
    bubble: ["#6bc4d0", "#f0bce2"],
    memory: ["#80bca6", "#eadb91"],
    rocket: ["#243864", "#6b518b"],
    gem: ["#4d286f", "#c65a9d"],
    golf: ["#72bf7b", "#d8dd78"],
    tower: ["#35255f", "#a862bf"],
    brick: ["#224c70", "#df725b"],
    derby: ["#397b4b", "#d79a55"],
    ski: ["#71b8dc", "#e6f5ff"],
    throw: ["#293b67", "#e18b42"],
  }[id] ?? ["#243864", "#6b518b"];
  bg.addColorStop(0, colors[0]);
  bg.addColorStop(1, colors[1]);
  c.fillStyle = bg;
  c.fillRect(0, 0, 600, 460);
  if (id === "bubble") {
    for (const [x, y, r] of [
      [120, 125, 65],
      [300, 210, 105],
      [475, 102, 56],
      [490, 340, 71],
      [145, 336, 52],
    ]) {
      c.fillStyle = "#ffffff24";
      c.strokeStyle = "#fff1";
      c.lineWidth = 7;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#fff";
      c.stroke();
      ellipse(c, x - r * 0.3, y - r * 0.4, r * 0.25, r * 0.12, "#ffffffcd");
    }
    c.strokeStyle = "#dc5c95";
    c.lineWidth = 19;
    c.beginPath();
    c.moveTo(390, 425);
    c.lineTo(440, 254);
    c.stroke();
    c.strokeStyle = "#f9d95b";
    c.lineWidth = 16;
    c.beginPath();
    c.arc(455, 211, 48, 0, Math.PI * 2);
    c.stroke();
  } else if (id === "memory") {
    for (let i = 0; i < 6; i++) {
      const x = 45 + (i % 3) * 175,
        y = 52 + Math.floor(i / 3) * 185;
      c.fillStyle = ["#fce0ad", "#ed82a3", "#aacddd"][i % 3];
      c.fillRect(x, y, 150, 156);
      c.fillStyle = "#294e50";
      c.textAlign = "center";
      c.font = "bold 94px sans-serif";
      c.fillText(["A", "2", "★", "A", "2", "★"][i], x + 75, y + 110);
    }
  } else if (id === "gem") {
    const gems = ["●", "★", "◆", "▲", "+"];
    for (let row = 0; row < 4; row++)
      for (let col = 0; col < 6; col++) {
        const x = 58 + col * 97,
          y = 70 + row * 105;
        circle(c, x, y, 39, "#24183473");
        c.fillStyle = ["#f7d252", "#ff7f9e", "#78e1cc", "#9aa7ff"][
          (row + col * 2) % 4
        ];
        c.font = "bold 60px sans-serif";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(gems[(row * 2 + col) % gems.length], x, y + 2);
      }
  } else if (id === "golf") {
    c.fillStyle = "#57a865";
    c.fillRect(0, 185, 600, 275);
    for (let x = -120; x < 700; x += 120) {
      c.fillStyle = "#ffffff14";
      c.fillRect(x, 185, 60, 275);
    }
    c.strokeStyle = "#fff7dd";
    c.lineWidth = 10;
    c.beginPath();
    c.moveTo(410, 105);
    c.lineTo(410, 345);
    c.stroke();
    triangle(
      c,
      [
        [410, 107],
        [410, 205],
        [515, 150],
      ],
      "#f27b78",
    );
    ellipse(c, 410, 352, 52, 19, "#295d42");
    circle(c, 178, 334, 44, "#fffdf1");
    for (const [x, y] of [
      [164, 322],
      [190, 338],
      [174, 355],
    ])
      circle(c, x, y, 4, "#b7c0b3");
  } else if (id === "tower") {
    const jewelColors = ["#f5cf55", "#6ed6be", "#f17c9d", "#8da3f2"];
    for (let col = 0; col < 5; col++)
      for (let row = 0; row <= col + 1; row++) {
        c.fillStyle = jewelColors[(col + row) % jewelColors.length];
        c.fillRect(75 + col * 94, 375 - row * 68, 70, 58);
        c.strokeStyle = "#ffffffb8";
        c.lineWidth = 5;
        c.strokeRect(75 + col * 94, 375 - row * 68, 70, 58);
      }
  } else if (id === "brick") {
    const brickColors = ["#f5c55a", "#ef7b70", "#7bcab9", "#9a8bdf"];
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 8; col++) {
        c.fillStyle = brickColors[row % brickColors.length];
        c.fillRect(34 + col * 67, 38 + row * 47, 58, 36);
      }
    c.fillStyle = "#fff4d9";
    c.fillRect(205, 397, 190, 25);
    circle(c, 300, 342, 20, "#ffffff");
  } else if (id === "derby") {
    c.fillStyle = "#66a858";
    c.fillRect(0, 0, 600, 460);
    c.save();
    c.translate(300, 270);
    c.rotate(Math.PI / 4);
    c.fillStyle = "#c99961";
    c.fillRect(-145, -145, 290, 290);
    c.fillStyle = "#77b867";
    c.fillRect(-92, -92, 184, 184);
    c.restore();
    circle(c, 444, 108, 58, "#fff9e8");
    c.strokeStyle = "#d85656";
    c.lineWidth = 7;
    c.beginPath();
    c.arc(444, 108, 38, -1.3, 1.3);
    c.stroke();
    c.beginPath();
    c.arc(444, 108, 38, 1.84, 4.44);
    c.stroke();
  } else if (id === "ski") {
    c.fillStyle = "#e9f7ff";
    c.fillRect(0, 170, 600, 290);
    triangle(
      c,
      [
        [20, 315],
        [170, 55],
        [330, 315],
      ],
      "#94c6dc",
    );
    triangle(
      c,
      [
        [195, 315],
        [375, 70],
        [590, 315],
      ],
      "#77b1cf",
    );
    triangle(
      c,
      [
        [105, 165],
        [170, 55],
        [240, 168],
      ],
      "#ffffff",
    );
    triangle(
      c,
      [
        [292, 182],
        [375, 70],
        [474, 183],
      ],
      "#ffffff",
    );
    c.strokeStyle = "#df6a67";
    c.lineWidth = 18;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(214, 337);
    c.lineTo(330, 407);
    c.stroke();
    c.beginPath();
    c.moveTo(259, 322);
    c.lineTo(374, 392);
    c.stroke();
  } else if (id === "throw") {
    c.fillStyle = "#dce7ed";
    c.fillRect(330, 65, 210, 155);
    c.strokeStyle = "#ffffff";
    c.lineWidth = 9;
    c.strokeRect(330, 65, 210, 155);
    c.strokeStyle = "#dc6547";
    c.lineWidth = 14;
    c.beginPath();
    c.ellipse(404, 240, 88, 25, 0, 0, Math.PI * 2);
    c.stroke();
    circle(c, 150, 350, 72, "#e58537");
    c.strokeStyle = "#55351f";
    c.lineWidth = 7;
    c.beginPath();
    c.arc(150, 350, 50, -Math.PI / 2, Math.PI / 2);
    c.stroke();
    c.beginPath();
    c.arc(150, 350, 50, Math.PI / 2, -Math.PI / 2);
    c.stroke();
  } else {
    for (let i = 0; i < 35; i++)
      circle(c, (i * 137) % 600, (i * 83) % 460, 1 + (i % 3), "#ffeec2");
    c.save();
    c.translate(300, 227);
    c.rotate(0.4);
    triangle(
      c,
      [
        [-36, 102],
        [0, 202],
        [36, 102],
      ],
      "#f6b755",
    );
    ellipse(c, 0, 0, 64, 130, "#eef9f6");
    triangle(
      c,
      [
        [-57, -56],
        [0, -169],
        [57, -56],
      ],
      "#e985a8",
    );
    circle(c, 0, -21, 37, "#477d9c");
    circle(c, 0, -21, 24, "#b6e1de");
    triangle(
      c,
      [
        [-45, 44],
        [-104, 123],
        [-49, 116],
      ],
      "#7ad1cc",
    );
    triangle(
      c,
      [
        [45, 44],
        [104, 123],
        [49, 116],
      ],
      "#7ad1cc",
    );
    c.restore();
    for (const [x, y] of [
      [110, 170],
      [468, 312],
    ])
      triangle(
        c,
        [
          [x, y - 34],
          [x + 24, y],
          [x, y + 34],
          [x - 24, y],
        ],
        "#82eee1",
      );
  }
  return canvasTexture(canvas);
}
