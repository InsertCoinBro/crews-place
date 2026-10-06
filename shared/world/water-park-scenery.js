import * as THREE from "three";
import { rounded, bar } from "./coaster.js";
import { label } from "./models.js";
import {
  WATER_COLORS,
  WATER_SLIDES,
  WATER_POOL,
  WATER_BOWL,
  bowlHeight,
} from "./water-park-track.js";
const v = (x, y, z) => new THREE.Vector3(x, y, z);
const mat = (color) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.46,
    metalness: 0,
    envMapIntensity: 0.25,
  });

function flowingTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const c = canvas.getContext("2d");
  c.fillStyle = "#059fcd";
  c.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 28; i++) {
    const x = (i * 73) % 256,
      y = (i * 37) % 128;
    c.strokeStyle = i % 3 ? "#72e7f6" : "#eaffff";
    c.lineWidth = i % 3 ? 2 : 4;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + 12, y - 6, x + 32, y + 2);
    c.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function surface(track, radius, startAngle, arc, water = false) {
  const positions = [],
    uv = [],
    colors = [],
    indices = [],
    sides = water ? 8 : 16;
  for (let i = 0; i <= track.count; i++) {
    const distance = (i / track.count) * track.length,
      p = track.points[i];
    const color = new THREE.Color(
      WATER_COLORS[Math.floor(distance / 17 + track.index * 2) % 6],
    );
    for (let j = 0; j <= sides; j++) {
      const a = startAngle + (arc * j) / sides,
        q = p
          .clone()
          .addScaledVector(track.rights[i], Math.cos(a) * radius)
          .addScaledVector(track.ups[i], Math.sin(a) * radius);
      positions.push(...q.toArray());
      uv.push(distance / 5, j / sides);
      colors.push(color.r, color.g, color.b);
      if (i < track.count && j < sides) {
        // The bowl has its own broad open surface, not a tube coiled inside it.
        if (track.inBowl(distance)) continue;
        if (!water && startAngle === 0 && Math.floor(distance / 16) % 4 === 1)
          continue;
        const a = i * (sides + 1) + j,
          b = a + 1,
          c = a + sides + 1,
          d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
function bowlGeometry(water = false) {
  const p = [],
    uv = [],
    colors = [],
    indices = [],
    rings = 28,
    sides = 144,
    b = WATER_BOWL;
  for (let i = 0; i <= rings; i++) {
    const r = THREE.MathUtils.lerp(b.hole, b.radius, i / rings);
    for (let j = 0; j <= sides; j++) {
      const a = (j / sides) * Math.PI * 2,
        c = new THREE.Color(WATER_COLORS[Math.floor((j / sides) * 18) % 6]);
      p.push(
        b.x + Math.sin(a) * r,
        bowlHeight(r) + (water ? 0.035 : 0),
        b.z + Math.cos(a) * r,
      );
      uv.push((j / sides) * 16, (i / rings) * 4);
      colors.push(c.r, c.g, c.b);
      if (i < rings && j < sides) {
        const a = i * (sides + 1) + j,
          c = a + sides + 1;
        indices.push(a, a + 1, c, a + 1, c + 1, c);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}
export function buildWaterTracks(park) {
  const g = park.group;
  park.waterTexture = flowingTexture();
  const water = new THREE.MeshStandardMaterial({
    map: park.waterTexture,
    roughness: 0.22,
    emissive: 0x045570,
    emissiveIntensity: 0.2,
    side: THREE.DoubleSide,
  });
  const shell = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.48,
    envMapIntensity: 0.2,
    side: THREE.DoubleSide,
  });
  for (const track of park.tracks) {
    for (const [angle, arc, radius, isWater] of [
      [Math.PI, Math.PI, 2.4, false],
      [0, Math.PI, 2.4, false],
      [Math.PI * 1.17, Math.PI * 0.66, 2.28, true],
    ]) {
      const mesh = new THREE.Mesh(
        surface(track, radius, angle, arc, isWater),
        isWater ? water : shell,
      );
      mesh.name = isWater
        ? "fast-flowing-slide-water"
        : `slide-${track.index}-shell`;
      g.add(mesh);
    }
    const distances = [];
    for (let d = 0; d < track.length; d += 10)
      if (!track.inBowl(d)) distances.push(d);
    const rings = new THREE.InstancedMesh(
        new THREE.TorusGeometry(2.44, 0.085, 6, 24),
        mat(0xfff5e0),
        distances.length,
      ),
      dummy = new THREE.Object3D();
    distances.forEach((d, i) => {
      const s = track.sample(d);
      dummy.position.copy(s.position);
      dummy.quaternion.copy(s.rotation);
      dummy.updateMatrix();
      rings.setMatrixAt(i, dummy.matrix);
    });
    g.add(rings);
    // Ground anchors avoid other tubes and the swimming lagoon.
    for (let d = 30; d < track.length - 25; d += 65) {
      const s = track.sample(d),
        p = s.position;
      if (
        track.inBowl(d) ||
        s.up.y < 0.6 ||
        Math.abs(s.tangent.y) > 0.5 ||
        p.z > -123
      )
        continue;
      if (
        park.tracks.some((t) =>
          t.points.some(
            (q, i) =>
              i % 10 === 0 &&
              Math.hypot(q.x - p.x, q.z - p.z) < 3 &&
              q.y < p.y - 5,
          ),
        )
      )
        continue;
      bar(
        g,
        v(p.x, 0.1, p.z),
        p.clone().addScaledVector(s.up, -2.5),
        0.27,
        WATER_SLIDES[track.index].color,
      );
    }
  }
  const bowl = new THREE.Mesh(bowlGeometry(), shell);
  bowl.name = "giant-open-whirlpool-bowl";
  g.add(bowl);
  const sheet = new THREE.Mesh(
    bowlGeometry(true),
    new THREE.MeshStandardMaterial({
      map: park.waterTexture,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      roughness: 0.2,
      side: THREE.DoubleSide,
    }),
  );
  g.add(sheet);
  for (const radius of [WATER_BOWL.radius, WATER_BOWL.hole]) {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.25, 8, 96),
      mat(radius > 10 ? 0xffcf32 : 0x742cbd),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(WATER_BOWL.x, bowlHeight(radius), WATER_BOWL.z);
    g.add(rim);
  }
  for (const dx of [-17, 17])
    for (const dz of [-17, 17])
      bar(
        g,
        v(WATER_BOWL.x + dx, 0, WATER_BOWL.z + dz),
        v(WATER_BOWL.x + dx, 36, WATER_BOWL.z + dz),
        0.4,
        0x9760e2,
      );
  label(
    g,
    "THE RAINBOW BOWL",
    WATER_BOWL.x,
    39,
    WATER_BOWL.z + 24,
    18,
    "#663a9e",
    "#ffffff",
  );
  park.foam = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.14, 6, 4),
    new THREE.MeshBasicMaterial({ color: 0xeaffff }),
    240,
  );
  park.foam.frustumCulled = false;
  g.add(park.foam);
  park.foamDummy = new THREE.Object3D();
}
function walkway(g, a, b, width, color) {
  const center = a.clone().add(b).multiplyScalar(0.5),
    distance = a.distanceTo(b);
  const mesh = rounded(
    g,
    [center.x, 0.055, center.z],
    [width, 0.09, distance],
    color,
    0.02,
  );
  mesh.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
}
export function buildWaterPark(park) {
  const g = park.group,
    p = WATER_POOL;
  rounded(g, [-168, 0.005, -192], [148, 0.07, 282], 0xf7dfb9, 0.02);
  walkway(g, v(-30, 0, -57), v(-151, 0, -57), 6, 0xffd485);
  walkway(g, v(-151, 0, -72), v(-238, 0, -72), 6, 0xffcb63);
  walkway(g, v(-238, 0, -72), v(-238, 0, -321), 6, 0xffcb63);
  park.lifts = [];
  WATER_SLIDES.forEach((slide, index) => {
    const [x, y, z] = slide.start;
    walkway(
      g,
      v(-238, 0, slide.entry.z),
      v(slide.entry.x, 0, slide.entry.z),
      5,
      slide.color,
    );
    rounded(
      g,
      [slide.entry.x, 0.1, slide.entry.z],
      [10, 0.18, 8],
      slide.color,
      0.08,
    );
    for (const dx of [-4, 4])
      for (const dz of [-4, 4])
        bar(
          g,
          v(x + dx, 0, z + dz),
          v(x + dx, y + 3, z + dz),
          0.38,
          slide.color,
        );
    for (let height = 12; height < y; height += 20)
      bar(g, v(x - 4, height, z - 4), v(x + 4, height, z - 4), 0.13, 0xfff2c3);
    rounded(g, [x, y - 2.5, z], [10, 0.5, 10], slide.color, 0.2);
    for (const dx of [-4.4, 4.4])
      bar(g, v(x + dx, y - 2.2, z - 4), v(x + dx, y + 1, z - 4), 0.1, 0xffffff);
    bar(
      g,
      v(x - 4.4, y + 0.3, z - 4),
      v(x + 4.4, y + 0.3, z - 4),
      0.1,
      0xffffff,
    );
    const lift = new THREE.Group();
    lift.position.set(x, 0, z);
    g.add(lift);
    rounded(lift, [0, -1.7, 0], [5, 0.3, 5], 0xffe066, 0.15);
    for (const dx of [-2.4, 2.4])
      for (const dz of [-2.4, 2.4])
        bar(lift, v(dx, -1.6, dz), v(dx, 2.6, dz), 0.08, 0xfff4ca);
    rounded(lift, [0, 2.7, 0], [5.3, 0.2, 5.3], slide.color, 0.1);
    lift.visible = false;
    park.lifts.push(lift);
    label(
      g,
      `${index + 1} · ${slide.name.toUpperCase()}`,
      slide.entry.x,
      4.5,
      slide.entry.z + 1,
      15,
      "#482175",
      "#ffffff",
    );
    label(
      g,
      `${slide.height} m · BOARD LIFT · E`,
      slide.entry.x,
      2.6,
      slide.entry.z + 1.1,
      10,
      "#fff8dd",
      "#542275",
    );
    label(g, `${index + 1}`, x, y + 4, z + 4, 6, "#482175", "#ffffff");
    // Only grounded tower posts collide with walkers; the entry lane stays open.
    for (const dx of [-4, 4])
      for (const dz of [-4, 4])
        park.game.areas.town.colliders.push({
          minX: x + dx - 0.5,
          maxX: x + dx + 0.5,
          minZ: z + dz - 0.5,
          maxZ: z + dz + 0.5,
          maxY: y,
        });
  });
  // Raised lagoon: water has real depth, a contained swimming area and an
  // unmistakable yellow staircase, rather than a flat decorative runout.
  rounded(g, [-166.5, 0.1, -102], [131, 0.2, 38], 0x1175bd, 0.05);
  for (const x of [p.minX, p.maxX])
    rounded(g, [x, 1.2, -102], [0.6, 2.4, 38], 0x8a58cf, 0.1);
  rounded(g, [-166.5, 1.2, p.minZ], [131, 2.4, 0.6], 0x8a58cf, 0.1);
  rounded(g, [-174, 1.2, p.maxZ], [116, 2.4, 0.6], 0x8a58cf, 0.1);
  rounded(g, [-103.5, 1.2, p.maxZ], [5, 2.4, 0.6], 0x8a58cf, 0.1);
  park.poolTexture = park.waterTexture.clone();
  park.poolTexture.repeat.set(22, 7);
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(130, 37),
    new THREE.MeshStandardMaterial({
      map: park.poolTexture,
      roughness: 0.4,
      transparent: true,
      opacity: 0.93,
      depthWrite: true,
      emissive: 0x05678a,
      emissiveIntensity: 0.18,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(-166.5, p.surface, -102);
  pool.name = "swimmable-splash-lagoon";
  g.add(pool);
  park.game.areas.town.colliders.push({
    minX: p.minX - 0.3,
    maxX: p.maxX + 0.3,
    minZ: p.minZ - 0.3,
    maxZ: p.maxZ + 0.3,
    maxY: 3,
  });
  for (let i = 0; i < 7; i++)
    rounded(
      g,
      [p.exitX, 0.18 + i * 0.18, -77 - i],
      [7, 0.36 + i * 0.36, 1.1],
      0xffd83f,
      0.06,
    );
  for (const x of [p.exitX - 3.4, p.exitX + 3.4])
    bar(g, v(x, 1, -76), v(x, 3.4, -84), 0.12, 0xffffff);
  label(
    g,
    "← SWIM TO THE YELLOW STEPS",
    -160,
    5,
    -82,
    24,
    "#174d86",
    "#ffffff",
  ).rotation.y = Math.PI;
  label(g, "POOL EXIT", p.exitX, 4.5, -81, 9, "#ffdc40", "#442568").rotation.y =
    Math.PI;
  for (let x = -219; x <= -120; x += 11) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.09, 6, 18),
      mat(0xffdd45),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, p.surface + 0.1, -87);
    g.add(ring);
  }
  park.splash = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.13, 6, 4),
    new THREE.MeshBasicMaterial({ color: 0xd7fbff }),
    36,
  );
  park.splash.visible = false;
  park.splash.frustumCulled = false;
  g.add(park.splash);
  for (let i = 0; i < 6; i++) {
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(10 + i * 0.65, 0.36, 8, 64, Math.PI),
      mat(WATER_COLORS[i]),
    );
    arch.position.set(-151, 1, -60);
    g.add(arch);
  }
  label(g, "RAINBOW RAPIDS", -151, 10, -59.5, 19, "#482175", "#ffffff");
  label(
    g,
    "3 SLIDES · 3 LIFTS · FOLLOW THE COLORS ←",
    -151,
    4,
    -59.4,
    22,
    "#fff9e0",
    "#542775",
  );
  label(g, "WATER PARK ←", -47, 2.4, -54, 8, "#6639a5", "#ffffff");
  bar(g, v(-47, 0, -54), v(-47, 2, -54), 0.12, 0xa357d9);
  for (const [i, slide] of WATER_SLIDES.entries()) {
    const x = -218 + i * 34;
    rounded(g, [x, 0.1, -71], [22, 0.18, 6], slide.color, 0.1);
    label(g, `${i + 1} · ${slide.name}`, x, 2.4, -69, 17, "#482175", "#ffffff");
  }
  // Shade, flower fountains and broad colorful paths make the ground park
  // welcoming as well as the skyline. All movement uses the global calm toggle.
  park.fountains = [];
  for (let i = 0; i < 5; i++) {
    const x = -225 + i * 25;
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(4, 1.8, 12),
      mat(WATER_COLORS[i]),
    );
    roof.position.set(x, 5, -57);
    g.add(roof);
    bar(g, v(x, 0, -57), v(x, 4.5, -57), 0.12, 0xffffff);
    rounded(g, [x, 0.6, -55], [5, 1.1, 1.3], WATER_COLORS[(i + 2) % 6], 0.25);
  }
  for (const [cx, cz] of [
    [-226, -195],
    [-221, -242],
    [-147, -153],
  ]) {
    for (let i = 5; i >= 0; i--) {
      const disc = new THREE.Mesh(
        new THREE.CircleGeometry((i + 1) * 1.2, 40),
        mat(WATER_COLORS[i]),
      );
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(cx, 0.08 + (6 - i) * 0.004, cz);
      g.add(disc);
    }
    const jet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.45, 4, 10),
      mat(0x68eaff),
    );
    jet.position.set(cx, 2, cz);
    g.add(jet);
    park.fountains.push(jet);
    for (let i = 0; i < 6; i++) {
      const petal = new THREE.Mesh(
        new THREE.SphereGeometry(1.1, 12, 8),
        mat(WATER_COLORS[i]),
      );
      petal.scale.y = 0.4;
      petal.position.set(cx + Math.sin(i) * 2, 3.8, cz + Math.cos(i) * 2);
      g.add(petal);
    }
  }
  label(g, "QUIET CORNER", -225, 2.2, -53, 10, "#fff9e0", "#542775");
}
