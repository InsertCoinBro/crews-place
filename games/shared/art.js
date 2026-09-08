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
  bg.addColorStop(
    0,
    id === "rocket" ? "#243864" : id === "memory" ? "#80bca6" : "#6bc4d0",
  );
  bg.addColorStop(
    1,
    id === "rocket" ? "#6b518b" : id === "memory" ? "#eadb91" : "#f0bce2",
  );
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
