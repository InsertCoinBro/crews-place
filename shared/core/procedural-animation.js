import * as THREE from "three";

// Procedural animation layer — runs AFTER the AnimationMixer each frame and
// adds life that authored clips can't: breathing, squash & stretch, lean,
// head look, and per-character personality. All offsets are applied on top of
// the current clip pose, so they compose with any authored animation.
//
// Also provides procedural gestures (Wave, Celebrate, Nod, ShakeHead,
// LookAround) for characters whose GLB lacks those clips (notably the cowboy).

const BONE_MAPS = {
  // Note: the GLTF loader strips dots from bone names, so DEF-spine.001
  // becomes DEF-spine001 and DEF-thigh.L becomes DEF-thighL at runtime.
  cowboy: {
    hips: "DEF-spine",
    chest: "DEF-spine003",
    head: "DEF-spine006",
    upperArmL: "DEF-upper_armL",
    forearmL: "DEF-forearmL",
    upperArmR: "DEF-upper_armR",
    forearmR: "DEF-forearmR",
    thighL: "DEF-thighL",
    thighR: "DEF-thighR",
  },
  jolly_robot: {
    hips: "DEF-hips",
    chest: "DEF-body",
    head: "DEF-head",
    upperArmL: "DEF-upper_armL",
    forearmL: "DEF-forearmL",
    upperArmR: "DEF-upper_armR",
    forearmR: "DEF-forearmR",
    thighL: "DEF-thighL",
    thighR: "DEF-thighR",
  },
  moon_mischief: {
    hips: "Root",
    chest: "Chest",
    head: "Head",
    upperArmL: "UpperArmL",
    forearmL: "ForearmL",
    upperArmR: "UpperArmR",
    forearmR: "ForearmR",
    thighL: "DEF-thighL",
    thighR: "DEF-thighR",
  },
};

// Personality tuning per character. Amplitudes are in radians (rotations) or
// unitless (scales); rates are in Hz.
const PROFILES = {
  cowboy: {
    breatheAmp: 0.028,
    breatheRate: 0.32,
    swayAmp: 0.055, // hip swagger when walking
    leanFwd: 0.045, // confident forward lean at speed
    squash: 1.0, // full squash & stretch
    idleSwayRate: 0.4,
    headLook: 0.5,
  },
  jolly_robot: {
    breatheAmp: 0.012,
    breatheRate: 0.5,
    swayAmp: 0.02,
    leanFwd: 0.02,
    squash: 0.45, // robots are rigid; keep it subtle
    idleSwayRate: 0.9, // servo twitch
    headLook: 0.7,
    mechanical: true, // quantize idle motion for a servo feel
  },
  moon_mischief: {
    breatheAmp: 0.04,
    breatheRate: 0.25,
    swayAmp: 0.08, // wobbly
    leanFwd: 0.03,
    squash: 1.35, // extra bouncy
    idleSwayRate: 0.55,
    headLook: 0.9,
    floatAmp: 0.035, // gentle hover bob
  },
};

function quantize(x, steps = 6) {
  return Math.round(x * steps) / steps;
}

export class ProceduralLayer {
  constructor(model) {
    this.model = model;
    this.avatarId = model.userData.avatarId || "cowboy";
    this.profile = PROFILES[this.avatarId] ?? PROFILES.cowboy;
    const map = BONE_MAPS[this.avatarId] ?? BONE_MAPS.cowboy;
    this.bones = {};
    for (const [key, name] of Object.entries(map)) {
      this.bones[key] = model.getObjectByName(name) || null;
    }
    this.time = Math.random() * 10;
    this.squashV = 0; // smoothed squash velocity
    this.landPulse = 0;
    this.leanX = 0;
    this.leanZ = 0;
    // Last-frame deltas for non-mixer-driven transforms (no accumulate).
    this.lastChestLift = 0;
    this.lastLeanX = 0;
    this.lastBounceY = 0;
    this.lastFloatY = 0;
    // Active procedural gesture: { name, time, duration } or null.
    this.gesture = null;
  }

  // Start a procedural gesture. Returns its duration, or 0 if unsupported.
  startGesture(name) {
    const durations = {
      Wave: 1.6,
      Celebrate: 2.2,
      Nod: 1.0,
      ShakeHead: 1.1,
      LookAround: 1.9,
    };
    const duration = durations[name];
    if (!duration) return 0;
    this.gesture = { name, time: 0, duration };
    return duration;
  }

  get gestureActive() {
    return !!this.gesture;
  }

  cancelGesture() {
    if (this.lastBounceY !== 0) {
      this.model.position.y -= this.lastBounceY;
      this.lastBounceY = 0;
    }
    this.gesture = null;
  }

  update(dt, { speed = 0, grounded = true, velocityY = 0, event = null } = {}) {
    this.time += dt;
    const p = this.profile;
    const b = this.bones;
    const t = this.time;
    const moving = speed > 0.15;

    // ---- Breathing (always on, subtle) ----
    if (b.chest) {
      let breath = Math.sin(t * Math.PI * 2 * p.breatheRate) * p.breatheAmp;
      if (p.mechanical) breath = quantize(breath, 5);
      b.chest.rotation.x += breath * 0.6;
      // Chest rise: remove last frame's lift, apply this frame's (no accumulate).
      b.chest.position.y -= this.lastChestLift;
      const lift = Math.abs(breath) * 0.35;
      b.chest.position.y += lift;
      this.lastChestLift = lift;
    }

    // ---- Squash & stretch ----
    // Stretch when rising fast, squash when falling fast or landing.
    let targetSquash = 0;
    if (!grounded) {
      targetSquash = THREE.MathUtils.clamp(-velocityY * 0.045, -0.22, 0.28) * p.squash;
    }
    if (event === "land") this.landPulse = 1;
    this.landPulse = Math.max(0, this.landPulse - dt * 4.5);
    targetSquash -= this.landPulse * 0.22 * p.squash;
    // Smooth toward target for soft, springy motion.
    this.squashV += (targetSquash - this.squashV) * Math.min(1, dt * 10);
    const s = this.squashV;
    this.model.scale.set(1 - s * 0.55, 1 + s, 1 - s * 0.55);

    // ---- Lean into motion ----
    const targetLeanX = moving
      ? THREE.MathUtils.clamp(speed * 0.012, 0, 0.09) * (p.leanFwd / 0.045)
      : 0;
    this.leanX += (targetLeanX - this.leanX) * Math.min(1, dt * 6);
    // Remove last frame's lean, apply the new one (no accumulate).
    this.model.rotation.x -= this.lastLeanX;
    this.model.rotation.x += this.leanX;
    this.lastLeanX = this.leanX;
    // Hip swagger: side-to-side sway scaled by speed.
    if (b.hips && moving) {
      const sway = Math.sin(t * Math.PI * 2 * 1.7) * p.swayAmp * Math.min(1, speed / 3);
      b.hips.rotation.z += p.mechanical ? quantize(sway, 5) : sway;
      b.hips.rotation.y += Math.sin(t * Math.PI * 2 * 0.85) * p.swayAmp * 0.5 * Math.min(1, speed / 3);
    }

    // ---- Head look ----
    if (b.head) {
      if (moving) {
        // Glance toward travel direction (subtle; the body already turns).
        b.head.rotation.y += Math.sin(t * 2.1) * 0.06 * p.headLook;
      } else {
        // Idle: curious look-arounds, per-character rhythm.
        const look = Math.sin(t * Math.PI * 2 * p.idleSwayRate * 0.5);
        const gated = Math.max(0, look - 0.55) * 2.2; // only peek occasionally
        b.head.rotation.y += (p.mechanical ? quantize(gated, 4) : gated) * 0.5 * p.headLook * Math.sign(Math.sin(t * 0.7));
        b.head.rotation.x += Math.sin(t * Math.PI * 2 * p.breatheRate * 0.5) * 0.03;
      }
    }

    // ---- Alien float ----
    if (p.floatAmp && b.hips) {
      b.hips.position.y -= this.lastFloatY;
      const floatY = Math.sin(t * Math.PI * 2 * 0.9) * p.floatAmp;
      b.hips.position.y += floatY;
      this.lastFloatY = floatY;
    } else if (b.hips) {
      b.hips.position.y -= this.lastFloatY;
      this.lastFloatY = 0;
    }

    // ---- Procedural gesture (overrides clip pose for its bones) ----
    if (this.gesture) {
      const g = this.gesture;
      g.time += dt;
      const k = Math.min(1, g.time / g.duration);
      // Ease weight in/out so it blends with the clip.
      const weight = Math.min(1, g.time / 0.18) * Math.min(1, (g.duration - g.time) / 0.25);
      this.applyGesture(g.name, k, THREE.MathUtils.clamp(weight, 0, 1));
      if (g.time >= g.duration) {
        this.model.position.y -= this.lastBounceY;
        this.lastBounceY = 0;
        this.gesture = null;
      }
    } else if (this.lastBounceY !== 0) {
      this.model.position.y -= this.lastBounceY;
      this.lastBounceY = 0;
    }

    // Keep the mixer-fed world matrices fresh for the next render.
    this.model.updateMatrixWorld(true);
  }

  applyGesture(name, k, weight) {
    if (weight <= 0) return;
    const b = this.bones;
    const blend = (bone, rx, ry, rz) => {
      if (!bone) return;
      if (weight > 0.85) {
        // At full weight, set the pose directly so we don't fight the mixer.
        bone.rotation.x = rx;
        bone.rotation.y = ry;
        bone.rotation.z = rz;
      } else {
        bone.rotation.x += (rx - bone.rotation.x) * weight;
        bone.rotation.y += (ry - bone.rotation.y) * weight;
        bone.rotation.z += (rz - bone.rotation.z) * weight;
      }
    };
    const TAU = Math.PI * 2;
    if (name === "Wave" && b.upperArmR && b.forearmR) {
      // Right arm up, forearm sweeps side to side.
      const wave = Math.sin(k * TAU * 3) * 0.55;
      blend(b.upperArmR, -2.4, 0, -0.5);
      blend(b.forearmR, -0.3, 0, wave);
      if (b.head) b.head.rotation.z += Math.sin(k * TAU * 3) * 0.06 * weight;
    } else if (name === "Celebrate") {
      // Both arms up, joyful bounce.
      const bounce = Math.abs(Math.sin(k * TAU * 2.5));
      blend(b.upperArmL, -2.7, 0, 0.6);
      blend(b.upperArmR, -2.7, 0, -0.6);
      blend(b.forearmL, -0.4, 0, 0);
      blend(b.forearmR, -0.4, 0, 0);
      this.model.position.y -= this.lastBounceY;
      const bounceY = bounce * 0.22 * weight;
      this.model.position.y += bounceY;
      this.lastBounceY = bounceY;
      if (b.head) b.head.rotation.x += -0.18 * weight;
    } else if (name === "Nod" && b.head) {
      b.head.rotation.x += Math.sin(k * TAU * 2) * 0.3 * weight;
    } else if (name === "ShakeHead" && b.head) {
      b.head.rotation.y += Math.sin(k * TAU * 2.5) * 0.42 * weight;
    } else if (name === "LookAround" && b.head) {
      // Sweep left, hold, sweep right.
      const sweep = k < 0.45 ? (k / 0.45) * 0.7 : k < 0.55 ? 0.7 : 0.7 - ((k - 0.55) / 0.45) * 1.4;
      b.head.rotation.y += (sweep - b.head.rotation.y) * weight;
    }
  }

  dispose() {
    this.cancelGesture();
    if (this.bones.chest) this.bones.chest.position.y -= this.lastChestLift;
    this.model.rotation.x -= this.lastLeanX;
    if (this.bones.hips) this.bones.hips.position.y -= this.lastFloatY;
    this.lastChestLift = 0;
    this.lastLeanX = 0;
    this.lastFloatY = 0;
  }
}
