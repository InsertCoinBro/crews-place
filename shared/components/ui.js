import { COASTER_STATION } from "../world/coaster-track.js";
import { BUILDINGS, TRAMPOLINE, LEAVES } from "../world/town.js";
import { WORLD_HALF_SIZE } from "../world/landscape.js";
import { FARM_BOUNDS, FARM_SITE } from "../world/farm.js";
import { AIRFIELD_BOUNDS, AIRFIELD_SITE } from "../world/airfield.js";
import { SPACE_BOUNDS, SPACE_LANDING_SITE } from "../world/space.js";
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
  update(dt, player, area, yaw, vehicle = null, plane = null) {
    if (this.toastTime > 0) {
      this.toastTime -= dt;
      if (this.toastTime <= 0) document.querySelector("#toast").hidden = true;
    }
    const name =
      area.id === "space"
        ? area.name
        : area.interior
          ? area.name
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
        const px = 90 + (x / SPACE_BOUNDS.maxX) * 76;
        const pz = 90 + (z / SPACE_BOUNDS.maxZ) * 76;
        c.fillStyle = "#545a73";
        c.beginPath();
        c.ellipse(px, pz, radius, radius * 0.68, 0, 0, Math.PI * 2);
        c.fill();
      }
      const landingX = 90 + (SPACE_LANDING_SITE.x / SPACE_BOUNDS.maxX) * 76;
      const landingZ = 90 + (SPACE_LANDING_SITE.z / SPACE_BOUNDS.maxZ) * 76;
      c.strokeStyle = "#9ce7df";
      c.lineWidth = 3;
      c.beginPath();
      c.arc(landingX, landingZ, 12, 0, Math.PI * 2);
      c.stroke();
      const playerX = 90 + (player.position.x / SPACE_BOUNDS.maxX) * 76;
      const playerZ = 90 + (player.position.z / SPACE_BOUNDS.maxZ) * 76;
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
      document.querySelector("#map-caption").textContent = "Landing area map";
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
    const point = (x, z) => [90 + x * mapScale, 90 + z * mapScale];
    const rect = (x, z, w, d, color) => {
      c.fillStyle = color;
      const p = point(x - w / 2, z - d / 2);
      c.fillRect(p[0], p[1], w * mapScale, d * mapScale);
    };
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
    const station = point(COASTER_STATION.x, COASTER_STATION.z);
    c.fillStyle = "#c13b79";
    c.beginPath();
    c.arc(...station, 4, 0, Math.PI * 2);
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
    c.fillStyle = "#315d4f";
    c.font = "bold 10px sans-serif";
    c.fillText("N", 86, 12);
    document.querySelector("#map-caption").textContent = area.interior
      ? "Inside " + area.name
      : "Find your own way";
  }
}
