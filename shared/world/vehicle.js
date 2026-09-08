import * as THREE from "three";
import { makeDriveableCar } from "./models.js";

export const PLAYER_CAR_SPEED = 8.64;

export class DriveableCar {
  constructor(group, route, startDistance) {
    this.route = route;
    this.distance = startDistance;
    this.speed = 0;
    this.travelDirection = 1;
    this.occupied = false;
    this.model = makeDriveableCar();
    this.model.userData.driveable = true;
    group.add(this.model);
    this.sync();
  }

  sync() {
    const point = this.route.sample(this.distance);
    this.model.position.set(point.x, 0, point.z);
    this.model.rotation.y =
      point.heading + (this.travelDirection < 0 ? Math.PI : 0);
    this.interaction && Object.assign(this.interaction, {
      x: point.x,
      z: point.z,
    });
  }

  update(dt, input) {
    const direction =
      Number(input.down("KeyW", "ArrowUp")) -
      Number(input.down("KeyS", "ArrowDown"));
    const targetSpeed = direction * PLAYER_CAR_SPEED;
    this.speed +=
      (targetSpeed - this.speed) * (1 - Math.exp(-7.5 * Math.max(dt, 0)));
    if (Math.abs(this.speed) > 0.05)
      this.travelDirection = this.speed < 0 ? -1 : 1;
    this.distance += this.speed * dt;
    const distanceMoved = this.speed * dt;
    this.sync();
    for (const wheel of this.model.userData.wheels ?? [])
      wheel.rotation.x += distanceMoved / 0.37;
    return this.speed;
  }

  cameraYaw() {
    return this.model.rotation.y + Math.PI;
  }

  enter(player) {
    if (this.occupied) return false;
    this.occupied = true;
    this.speed = 0;
    player.teleport(this.model.position.x, this.model.position.z);
    player.heading = this.model.rotation.y;
    player.inVehicle = true;
    player.model.visible = false;
    player.sync();
    return true;
  }

  exit(player) {
    if (!this.occupied) return false;
    this.occupied = false;
    this.speed = 0;
    const heading = this.model.rotation.y;
    const side = new THREE.Vector3(Math.cos(heading), 0, -Math.sin(heading));
    const forward = new THREE.Vector3(Math.sin(heading), 0, Math.cos(heading));
    const spot = this.model.position
      .clone()
      .addScaledVector(side, 2.15)
      .add(new THREE.Vector3(0, 0, 0));
    // The first spot is the driver's side. The fallback keeps exit reliable
    // even when the car is parked at a corner of the loop.
    if (!Number.isFinite(spot.x) || !Number.isFinite(spot.z))
      spot.copy(this.model.position).addScaledVector(forward, -2.4);
    player.teleport(spot.x, spot.z);
    player.heading = heading;
    player.inVehicle = false;
    player.model.visible = true;
    player.sync();
    return true;
  }
}
