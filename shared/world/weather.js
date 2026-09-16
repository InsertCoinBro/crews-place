import * as THREE from "three";
import { blob } from "./models.js";

const smooth = (a, b, v) => {
  const t = THREE.MathUtils.clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const band = (d, a, b) => smooth(a, a + 100, d) * (1 - smooth(b - 100, b, d));
export function sampleWeather(position, time = 0, gentle = false) {
  const d = -position.z;
  const rain = band(d, 180, 760),
    wind = band(d, 640, 1380),
    snow = band(d, 1240, 1970);
  const strength = (rain * 1.5 + wind * 5 + snow * 2.5) * (gentle ? 0.4 : 1);
  const altitude = smooth(0, 18, position.y);
  return {
    name:
      snow > 0.2
        ? "Winter · Snow"
        : wind > 0.2
          ? "Autumn · Windy passes"
          : rain > 0.2
            ? "Spring · Rain"
            : "Summer · Clear skies",
    rain,
    snow,
    cloud: Math.max(rain, wind * 0.5, snow),
    windX:
      strength * (0.65 + 0.35 * Math.sin(time * 0.7 + d * 0.008)) * altitude,
    windZ: strength * Math.sin(time * 0.35) * 0.4 * altitude,
    lift: strength * Math.sin(time * 1.3 + d * 0.015) * 0.22 * altitude,
    bank: strength * Math.sin(time * 0.9) * 0.015 * altitude,
  };
}

export class Weather {
  constructor(group) {
    this.time = 0;
    this.group = new THREE.Group();
    this.group.name = "northern-weather";
    group.add(this.group);
    this.clouds = [];
    for (let i = 0; i < 26; i++) {
      const cloud = new THREE.Group();
      cloud.position.set(
        Math.sin(i * 3.7) * 70,
        85 + (i % 4) * 12,
        -200 - i * 68,
      );
      for (let j = 0; j < 4; j++) {
        const puff = blob(
          cloud,
          (j - 1.5) * 9,
          Math.sin(j) * 3,
          0,
          11,
          0xd6e2e7,
          1,
        );
        puff.scale.set(1.3, 0.48, 1);
        puff.castShadow = false;
      }
      this.group.add(cloud);
      this.clouds.push({ cloud, x: cloud.position.x });
    }
    this.count = 600;
    this.positions = new Float32Array(this.count * 6);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(this.positions, 3),
    );
    this.material = new THREE.LineBasicMaterial({
      color: 0xddeeff,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    this.particles = new THREE.LineSegments(this.geometry, this.material);
    this.particles.frustumCulled = false;
    this.group.add(this.particles);
  }
  update(dt, position, active, gentle) {
    this.group.visible = active;
    if (!active) return sampleWeather({ z: 0, y: 0 });
    this.time += dt;
    const w = sampleWeather(position, this.time, gentle);
    for (const { cloud, x } of this.clouds)
      cloud.position.x = x + Math.sin(this.time * 0.025) * 8;
    const amount = Math.max(w.rain, w.snow),
      count = Math.floor(this.count * amount * (gentle ? 0.25 : 1));
    this.geometry.setDrawRange(0, count * 2);
    const snow = w.snow > w.rain;
    this.material.color.set(snow ? 0xffffff : 0xabcde0);
    for (let i = 0; i < count; i++) {
      const t = this.time * (snow ? 2 : 23);
      const x = ((((i * 17.137 + this.time * w.windX) % 64) + 64) % 64) - 32;
      const y = ((((i * 7.37 - t) % 38) + 38) % 38) - 12;
      const z = ((i * 23.719) % 72) - 36;
      const k = i * 6,
        length = snow ? 0.18 : 1.7;
      this.positions.set(
        [x, y, z, x + (snow ? 0.13 : w.windX * 0.045), y + length, z],
        k,
      );
    }
    this.particles.position.copy(position);
    this.geometry.attributes.position.needsUpdate = true;
    return w;
  }
}
