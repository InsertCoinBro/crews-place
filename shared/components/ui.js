import { MAZE_SITE, makeMaze } from "../world/corn-maze.js";
const mapMaze = makeMaze();
import { COASTER_STATION } from "../world/coaster-track.js";
import { SPACE_DIVE_STATION } from "../world/space-dive-track.js";
import { BUILDINGS, TRAMPOLINE, LEAVES } from "../world/town.js";
import { WORLD_HALF_SIZE } from "../world/landscape.js";
import { FARM_BOUNDS, FARM_SITE } from "../world/farm.js";
import {
  AIRFIELD_BOUNDS,
  AIRFIELD_SITE,
  NORTH_AIRFIELD_SITE,
} from "../world/airfield.js";
import { SPACE_BOUNDS, SPACE_LANDING_SITE } from "../world/space.js";
import { insideBubbleArena } from "../world/bubble-arena.js";
import { ROCKET_BOUNDS, ROCKET_SITE } from "../world/rocket.js";
export class UI {
  constructor() {
    this.prompt = document.querySelector("#prompt");
    this.lastPrompt = "";
    this.toastTime = 0;
    this.map = document.querySelector("#map").getContext("2d");
    this.mapTimer = 0;
    this.panel = document.querySelector("#panel");
    this.lastLocation = "";
  }
  showPrompt(item) {
    const key = item?.id ?? "";
    if (key === this.lastPrompt) return;
    this.lastPrompt = key;
    this.prompt.hidden = !item;
    if (item) {
      this.prompt.replaceChildren();
      const k = document.createElement("kbd");
      k.textContent = item.key ?? "E";
      const content = document.createElement("span");
      content.textContent = item.label;
      const small = document.createElement("small");
      small.textContent = item.hint ?? "";
      content.append(small);
      this.prompt.append(k, content);
    }
  }
  toast(message) {
    const el = document.querySelector("#toast");
    el.textContent = message;
    el.hidden = false;
    this.toastTime = 3;
  }
  update(dt, player, area, yaw, vehicle = null, plane = null, rocket = null) {
    if (this.toastTime > 0) {
      this.toastTime -= dt;
      if (this.toastTime <= 0) document.querySelector("#toast").hidden = true;
    }
    const name =
      area.id === "space"
        ? insideBubbleArena(player.position)
          ? "Bubble Basin"
          : player.position.x < -120 && player.position.x > -760 &&
            player.position.z > -710 && player.position.z < 680
          ? "Moonbeam Rally"
          : player.position.x < -32 && player.position.x > -84 &&
              player.position.z > -38 && player.position.z < 65
            ? "Starlight Playground"
            : area.name
        : player.position.x < -90 && player.position.z > -50
          ? "Harvest Corn Maze"
          : area.interior
            ? area.name
            : player.position.x >= ROCKET_BOUNDS.minX &&
                player.position.x <= ROCKET_BOUNDS.maxX &&
                player.position.z >= ROCKET_BOUNDS.minZ &&
                player.position.z <= ROCKET_BOUNDS.maxZ
              ? "Starbound Launch Pad"
              : player.position.z < -2100 &&
                  player.position.z > -2300 &&
                  player.position.x > 30
                ? "North Meadow Airfield"
                : player.position.x > 35 && player.position.z < -98 && player.position.z > -155
                  ? "Space Dive Launch Station"
                  : player.inVehicle && player.position.y > 175
                    ? "Space Dive · Space Flyby"
                : player.position.z < -90
                  ? "Northern Meadows"
                  : player.position.x >= AIRFIELD_BOUNDS.minX &&
                      player.position.x <= AIRFIELD_BOUNDS.maxX &&
                      player.position.z >= AIRFIELD_BOUNDS.minZ &&
                      player.position.z <= AIRFIELD_BOUNDS.maxZ
                    ? "Skybird Airfield"
                    : player.position.x >= FARM_BOUNDS.minX &&
                        player.position.x <= FARM_BOUNDS.maxX &&
                        player.position.z >= FARM_BOUNDS.minZ &&
                        player.position.z <= FARM_BOUNDS.maxZ
                      ? "Friendly Farm"
                      : player.position.z < -32 && player.position.x > -42
                        ? "Rainbow Rush Coaster Park"
                        : Math.abs(player.position.x) > 72 ||
                            Math.abs(player.position.z) > 72
                          ? "Countryside Edge"
                          : Math.abs(player.position.x) > 30 ||
                              Math.abs(player.position.z) > 30
                            ? "Open Countryside"
                            : player.position.x > 2 &&
                                player.position.x < 21 &&
                                player.position.z > 0 &&
                                player.position.z < 21
                              ? "Meadow Park"
                              : Math.abs(player.position.x) > 21 ||
                                  Math.abs(player.position.z) > 21
                                ? "Neighborhood Lane"
                                : "Town Square";
    if (name !== this.lastLocation) {
      document.querySelector("#location-name").textContent = name;
      this.lastLocation = name;
    }
    this.mapTimer += dt;
    if (this.mapTimer < 0.08) return;
    this.mapTimer = 0;
    const c = this.map;
    c.clearRect(0, 0, 180, 180);
    if (area.id === "space") {
      const mapX = (x) =>
        10 +
        ((x - area.bounds.minX) / (area.bounds.maxX - area.bounds.minX)) * 160;
      const mapZ = (z) =>
        10 +
        ((z - area.bounds.minZ) / (area.bounds.maxZ - area.bounds.minZ)) * 160;
      c.fillStyle = "#080d26";
      c.fillRect(0, 0, 180, 180);
      c.fillStyle = "#737991";
      c.fillRect(10, 10, 160, 160);
      for (const [x, z, radius] of [
        [-24, -18, 10],
        [22, -22, 7],
        [28, 28, 11],
        [-29, 25, 6],
      ]) {
        const px = mapX(x);
        const pz = mapZ(z);
        c.fillStyle = "#545a73";
        c.beginPath();
        c.ellipse(px, pz, radius, radius * 0.68, 0, 0, Math.PI * 2);
        c.fill();
      }
      for (const [x, z, color] of [
        [-45, 24, "#c4a8d8"],
        [-46, 44, "#86bfc3"],
        [-67, 9, "#f0cd85"],
        [-65, -15, "#9fe3dc"],
      ]) {
        c.fillStyle = color;
        c.beginPath();
        c.arc(mapX(x), mapZ(z), 4, 0, Math.PI * 2);
        c.fill();
      }
      const landingX = mapX(SPACE_LANDING_SITE.x);
      const landingZ = mapZ(SPACE_LANDING_SITE.z);
      c.strokeStyle = "#9ce7df";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(landingX, landingZ, 12, 0, Math.PI * 2);
      c.stroke();
      const playerX = mapX(player.position.x);
      const playerZ = mapZ(player.position.z);
      c.save();
      c.translate(playerX, playerZ);
      c.rotate(-yaw);
      c.fillStyle = "#fffdf1";
      c.strokeStyle = "#233050";
      c.lineWidth = 2.5;
      c.beginPath();
      c.moveTo(0, -7);
      c.lineTo(5, 5);
      c.lineTo(0, 3);
      c.lineTo(-5, 5);
      c.closePath();
      c.fill();
      c.stroke();
      c.restore();
      document.querySelector("#map-title").textContent = "SPACE ZONE";
      document.querySelector("#map-caption").textContent =
        "Rocket & playground";
      document
        .querySelector("#map")
        .setAttribute(
          "aria-label",
          "Space landing area map showing your position",
        );
      return;
    }
    document.querySelector("#map-title").textContent = "LITTLE TOWN";
    document
      .querySelector("#map")
      .setAttribute("aria-label", "Town map showing your position");
    c.fillStyle = "#abc992";
    c.fillRect(0, 0, 180, 180);
    const mapScale = 80 / WORLD_HALF_SIZE;
    const mapCenterZ =
      !area.interior && player.position.z < -90 ? player.position.z : 0;
    const point = (x, z) => [
      90 + (x - (player.position.x < -90 ? -164 : 0)) * mapScale,
      90 + (z - (player.position.x < -90 ? 24 : mapCenterZ)) * mapScale,
    ];
    if (mapCenterZ)
      document.querySelector("#map-title").textContent = "NORTHERN MEADOWS";
    const rect = (x, z, w, d, color) => {
      c.fillStyle = color;
      const p = point(x - w / 2, z - d / 2);
      c.fillRect(p[0], p[1], w * mapScale, d * mapScale);
    };
    rect(-164, 24, 136, 136, "#739342");
    for (let row = 0; row < 17; row++)
      for (let col = 0; col < 17; col++)
        if (!mapMaze[row][col])
          rect(
            MAZE_SITE.minX + (col + 0.5) * 8,
            MAZE_SITE.minZ + (row + 0.5) * 8,
            8,
            8,
            "#dec58d",
          );
    if (player.position.x < -90)
      document.querySelector("#map-title").textContent = "CORN MAZE";
    for (const z of [-24, 24]) rect(0, z, 54, 6, "#819b98");
    for (const x of [-24, 24]) rect(x, 0, 6, 54, "#819b98");
    rect(0, 0, 4, 38, "#f4e6c6");
    rect(0, -3, 38, 3.5, "#f4e6c6");
    for (const b of BUILDINGS)
      rect(b.x, b.z, b.w, b.d, "#" + b.color.toString(16));
    for (const [x, z, r, col] of [
      [TRAMPOLINE.x, TRAMPOLINE.z, 5, "#3f7077"],
      [LEAVES.x, LEAVES.z, 4, "#c0844e"],
    ]) {
      const p = point(x, z);
      c.fillStyle = col;
      c.beginPath();
      c.arc(...p, r, 0, Math.PI * 2);
      c.fill();
    }
    rect(22, -59, 125, 54, "#b4d6b3");
    rect(FARM_SITE.x, FARM_SITE.z, FARM_SITE.width, FARM_SITE.depth, "#d6c38b");
    rect(AIRFIELD_SITE.x, AIRFIELD_SITE.z, 12, 64, "#52666c");
    rect(AIRFIELD_SITE.hangar.x, AIRFIELD_SITE.hangar.z, 11, 13, "#f0cf6b");
    rect(NORTH_AIRFIELD_SITE.x, NORTH_AIRFIELD_SITE.z, 12, 164, "#52666c");
    rect(
      NORTH_AIRFIELD_SITE.hangar.x,
      NORTH_AIRFIELD_SITE.hangar.z,
      11,
      13,
      "#f0cf6b",
    );
    const station = point(COASTER_STATION.x, COASTER_STATION.z);
    c.fillStyle = "#c13b79";
    c.beginPath();
    c.arc(...station, 4, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#3766d6";
    c.beginPath();
    c.arc(...point(SPACE_DIVE_STATION.x, SPACE_DIVE_STATION.z), 4, 0, Math.PI * 2);
    c.fill();
    const px = area.interior
        ? BUILDINGS.find((b) => b.id === area.id).x
        : player.position.x,
      pz = area.interior ? -12 : player.position.z;
    const p = point(px, pz);
    c.save();
    c.translate(...p);
    c.rotate(-yaw);
    c.fillStyle = "#fffdf1";
    c.strokeStyle = "#24584f";
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(0, -7);
    c.lineTo(5, 5);
    c.lineTo(0, 3);
    c.lineTo(-5, 5);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
    if (vehicle && area.id === "town") {
      const car = point(vehicle.model.position.x, vehicle.model.position.z);
      c.fillStyle = "#2f7780";
      c.fillRect(car[0] - 4, car[1] - 4, 8, 8);
      c.strokeStyle = "#fff3c7";
      c.lineWidth = 1.5;
      c.strokeRect(car[0] - 4, car[1] - 4, 8, 8);
    }
    if (plane && area.id === "town") {
      const aircraft = point(plane.model.position.x, plane.model.position.z);
      c.save();
      c.translate(...aircraft);
      c.rotate(-plane.heading);
      c.fillStyle = "#f5cf58";
      c.beginPath();
      c.moveTo(0, -6);
      c.lineTo(3, 4);
      c.lineTo(0, 2.5);
      c.lineTo(-3, 4);
      c.closePath();
      c.fill();
      c.restore();
    }
    if (rocket && !rocket.arrived && area.id === "town") {
      const launch = point(ROCKET_SITE.x, ROCKET_SITE.z);
      c.fillStyle = "#e66f58";
      c.beginPath();
      c.arc(launch[0], launch[1], 4.5, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#fff0ad";
      c.lineWidth = 1.5;
      c.stroke();
    }
    c.fillStyle = "#315d4f";
    c.font = "bold 10px sans-serif";
    c.fillText("N", 86, 12);
    document.querySelector("#map-caption").textContent = area.interior
      ? "Inside " + area.name
      : player.position.x < -90 ? "Golden finish at the west exit" : "North airfield: " +
        Math.round(
          Math.hypot(
            player.position.x - NORTH_AIRFIELD_SITE.x,
            player.position.z - NORTH_AIRFIELD_SITE.z,
          ),
        ) +
        " m";
  }
}
