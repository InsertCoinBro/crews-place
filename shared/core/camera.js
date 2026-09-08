import * as THREE from "three";

function dampAngle(current, target, rate, dt) {
  const delta = Math.atan2(
    Math.sin(target - current),
    Math.cos(target - current),
  );
  return current + delta * (1 - Math.exp(-rate * dt));
}

export class FollowCamera {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0.36;
    this.target = new THREE.Vector3();
    this.ready = false;
    this.calm = false;
    this.ray = new THREE.Raycaster();
  }
  reset(yaw = 0) {
    this.yaw = yaw;
    this.ready = false;
  }
  update(dt, player, input, area, view = {}) {
    const sensitivity = this.calm ? 0.0018 : 0.003;
    this.yaw -= input.lookX * sensitivity;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch + input.lookY * sensitivity,
      0.12,
      0.85,
    );
    if (input.down("KeyQ")) this.yaw += dt * 1.3;
    if (input.down("KeyR")) this.yaw -= dt * 1.3;
    input.lookX = input.lookY = 0;
    if (view.yaw !== undefined)
      this.yaw = dampAngle(this.yaw, view.yaw, view.turnRate ?? 6.5, dt);
    else if (player.movementViewYaw !== null)
      this.yaw = dampAngle(this.yaw, player.movementViewYaw, 5.5, dt);
    const target = player.position
      .clone()
      .add(new THREE.Vector3(0, view.targetHeight ?? 1.25, 0));
    if (!this.ready) this.target.copy(target);
    else this.target.lerp(target, 1 - Math.exp(-12 * dt));
    const distance = view.distance ?? (area.interior ? 5 : 7.8);
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    this.ray.set(this.target, offset);
    this.ray.far = distance;
    const hits = this.ray.intersectObjects(area.cameraMeshes, false);
    const safeDistance = hits.length
      ? Math.max(0.22, hits[0].distance - 0.35)
      : distance;
    const desired = this.target.clone().addScaledVector(offset, safeDistance);
    if (!this.ready || hits.length) this.camera.position.copy(desired);
    else this.camera.position.lerp(desired, 1 - Math.exp(-10 * dt));
    this.camera.position.y = Math.max(
      (area.groundY ?? 0) + 0.3,
      this.camera.position.y,
    );
    this.camera.lookAt(this.target);
    this.ready = true;
    player.model.visible =
      !player.inVehicle && this.camera.position.distanceTo(this.target) > 0.9;
  }
}
