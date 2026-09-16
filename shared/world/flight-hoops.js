import * as THREE from "three";

export const FLIGHT_HOOPS = [
  [-25, 42, -310],
  [-25, 55, -520],
  [25, 55, -850],
  [25, 45, -980],
  [-25, 58, -1180],
  [-25, 48, -1320],
  [25, 57, -1510],
  [-25, 58, -1790],
  [-25, 45, -1900],
  [52, 30, -2020],
].map(([x, y, z], index) => ({ id: index, x, y, z, radius: 11 }));

export function crossesHoop(a, b, hoop) {
  const dz = b.z - a.z;
  if (Math.abs(dz) < 1e-7) return false;
  const t = (hoop.z - a.z) / dz;
  if (t <= 0 || t > 1) return false;
  const x = a.x + (b.x - a.x) * t,
    y = a.y + (b.y - a.y) * t;
  // The aircraft wings must fit inside the ring, not just its center point.
  return Math.hypot(x - hoop.x, y - hoop.y) < hoop.radius - 3.5;
}

export class FlightHoops {
  constructor(parent) {
    this.passed = new Set();
    this.previous = null;
    this.rings = FLIGHT_HOOPS.map((h, i) => {
      const material = new THREE.MeshStandardMaterial({
        color: [0xff8757, 0x63dcdf, 0xd990ff, 0xffd65d][i % 4],
        emissive: [0xe34c19, 0x197c91, 0x8734b8, 0xb88812][i % 4],
        emissiveIntensity: 0.4,
        roughness: 0.35,
      });
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(h.radius, 0.48, 10, 64),
        material,
      );
      ring.position.set(h.x, h.y, h.z);
      ring.name = "flight-hoop-" + i;
      parent.add(ring);
      // Short colored tabs make the opening readable from either direction.
      for (let n = 0; n < 8; n++) {
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(0.65, 8, 6),
          material,
        );
        const angle = (n * Math.PI) / 4;
        marker.position.set(
          Math.cos(angle) * h.radius,
          Math.sin(angle) * h.radius,
          0,
        );
        ring.add(marker);
      }
      return ring;
    });
  }
  update(position, flying) {
    if (!flying) {
      this.previous = null;
      return null;
    }
    let crossed = null;
    if (this.previous)
      for (const h of FLIGHT_HOOPS) {
        if (!this.passed.has(h.id) && crossesHoop(this.previous, position, h)) {
          this.passed.add(h.id);
          this.rings[h.id].material.color.set(0x79d999);
          this.rings[h.id].material.emissive.set(0x267346);
          crossed = h;
        }
      }
    this.previous ??= new THREE.Vector3();
    this.previous.copy(position);
    return crossed;
  }
}
