import * as THREE from "three";
import { moveHorizontal, stepVertical } from "./physics.js";

const MOVEMENT_TURN_RATE = 2.6;
const CONTINUOUS_STEER_RATE = 2.6;

function dampAngle(current, target, rate, dt) {
  const delta = Math.atan2(
    Math.sin(target - current),
    Math.cos(target - current),
  );
  return current + delta * (1 - Math.exp(-rate * dt));
}

export class Player {
  constructor(scene, model) {
    this.model = model;
    scene.add(this.model);
    this.position = new THREE.Vector3(0, 0, 15);
    this.velocity = new THREE.Vector2();
    this.velocityY = 0;
    this.grounded = true;
    this.heading = Math.PI;
    this.actualSpeed = 0;
    this.isRunning = false;
    this.jumpWindup = 0;
    this.movementBasisYaw = null;
    this.movementInputKey = "";
    this.movementViewYaw = null;
    this.movementTargetViewYaw = null;
    this.inVehicle = false;
  }
  setModel(model) {
    if (this.model === model) return;
    const scene = this.model.parent;
    scene?.remove(this.model);
    this.model.animator?.reset();
    this.model = model;
    this.jumpWindup = 0;
    scene?.add(model);
    model.animator?.reset();
    this.sync();
  }
  gesture(name) {
    if (!this.grounded || this.actualSpeed > 0.15) return false;
    return this.model.animator?.trigger(name) ?? false;
  }
  teleport(x, z, y = 0) {
    this.position.set(x, y, z);
    this.velocity.set(0, 0);
    this.velocityY = 0;
    this.grounded = true;
    this.actualSpeed = 0;
    this.jumpWindup = 0;
    this.movementBasisYaw = null;
    this.movementInputKey = "";
    this.movementViewYaw = null;
    this.movementTargetViewYaw = null;
    this.model.animator?.reset();
    this.sync();
  }
  update(dt, input, yaw, area) {
    const rawSide =
      Number(input.down("KeyD", "ArrowRight")) -
      Number(input.down("KeyA", "ArrowLeft"));
    const rawForward =
      Number(input.down("KeyW", "ArrowUp")) -
      Number(input.down("KeyS", "ArrowDown"));
    let side = rawSide;
    let forward = rawForward;
    const length = Math.hypot(side, forward);
    const backingUp = rawForward < 0 && rawSide === 0;
    if (length) {
      side /= length;
      forward /= length;
    }
    this.isRunning = input.down("ShiftLeft", "ShiftRight") && length > 0;
    const speed = this.isRunning ? 8.2 : 5.2;
    const inputKey = `${rawSide},${rawForward}`;
    if (!length) {
      this.movementBasisYaw = null;
      this.movementInputKey = "";
      this.movementViewYaw = null;
      this.movementTargetViewYaw = null;
    } else if (
      this.movementBasisYaw === null ||
      this.movementInputKey !== inputKey
    ) {
      this.movementBasisYaw = yaw;
      this.movementInputKey = inputKey;
    }
    const movementYaw = this.movementBasisYaw ?? yaw;
    let targetX = 0;
    let targetZ = 0;
    if (length) {
      this.movementViewYaw ??= yaw;
      if (rawSide !== 0 && rawForward >= 0) {
        // Holding a side key behaves like sustained joystick steering.
        this.movementViewYaw -= rawSide * CONTINUOUS_STEER_RATE * dt;
        this.movementTargetViewYaw = this.movementViewYaw;
      } else {
        this.movementTargetViewYaw = movementYaw;
        this.movementViewYaw = dampAngle(
          this.movementViewYaw,
          this.movementTargetViewYaw,
          backingUp ? 10 : MOVEMENT_TURN_RATE,
          dt,
        );
      }
      const direction = backingUp ? 1 : -1;
      targetX = Math.sin(this.movementViewYaw) * speed * direction;
      targetZ = Math.cos(this.movementViewYaw) * speed * direction;
    }
    this.velocity.lerp(
      new THREE.Vector2(targetX, targetZ),
      1 - Math.exp(-14 * dt),
    );
    const beforeX = this.position.x,
      beforeZ = this.position.z;
    moveHorizontal(
      this.position,
      this.velocity.x * dt,
      this.velocity.y * dt,
      area.colliders,
      area.bounds,
    );
    if (input.consume("Space") && this.grounded && this.jumpWindup === 0) {
      const anticipation = this.model.animator?.actions.get("JumpStart");
      if (anticipation) this.jumpWindup = anticipation.getClip().duration;
      else {
        this.velocityY = 8;
        this.grounded = false;
      }
    }
    if (this.jumpWindup > 0) {
      this.jumpWindup = Math.max(0, this.jumpWindup - dt);
      if (this.jumpWindup === 0) {
        this.velocityY = 8;
        this.grounded = false;
      }
    }
    const groundY = area.groundHeightAt?.(this.position.x, this.position.z);
    const event = stepVertical(
      this,
      dt,
      area.trampoline,
      groundY ?? area.groundY ?? 0,
    );
    this.actualSpeed =
      dt > 0
        ? Math.hypot(this.position.x - beforeX, this.position.z - beforeZ) / dt
        : 0;
    for (const [key, gesture] of [
      ["KeyF", "Wave"],
      ["KeyG", "Celebrate"],
      ["KeyH", "LookAround"],
      ["KeyJ", "Nod"],
      ["KeyK", "ShakeHead"],
    ]) {
      if (input.consume(key))
        this.gesture(
          key === "KeyF" && this.model.userData.avatarId === "cowboy"
            ? "Dance"
            : gesture,
        );
    }
    this.model.animator?.update(dt, {
      speed: this.actualSpeed,
      running: this.isRunning,
      grounded: this.grounded,
      velocityY: this.velocityY,
      event,
      preparingJump: this.jumpWindup > 0,
    });
    if (this.velocity.length() > 0.15) {
      const target =
        this.movementViewYaw === null
          ? Math.atan2(this.velocity.x, this.velocity.y)
          : this.movementViewYaw + Math.PI;
      this.heading +=
        Math.atan2(
          Math.sin(target - this.heading),
          Math.cos(target - this.heading),
        ) *
        (1 - Math.exp(-16 * dt));
    }
    this.sync();
    return event;
  }
  sync() {
    this.model.position.copy(this.position);
    this.model.rotation.y = this.heading;
  }
}
