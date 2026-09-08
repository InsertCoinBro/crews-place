import { makeCar } from "./models.js";
import { Route } from "./routes.js";
export const TRAFFIC_ROUTES = [
  new Route([
    [-21, -25.1],
    [21, -25.1],
    [25.1, -21],
    [25.1, 21],
    [21, 25.1],
    [-21, 25.1],
    [-25.1, 21],
    [-25.1, -21],
  ]),
  new Route([
    [-20, -22.8],
    [-22.8, -20],
    [-22.8, 20],
    [-20, 22.8],
    [20, 22.8],
    [22.8, 20],
    [22.8, -20],
    [20, -22.8],
  ]),
];
export class Traffic {
  constructor(group) {
    this.cars = Array.from({ length: 4 }, (_, i) => {
      const model = makeCar([0xd79078, 0xeac567, 0x78a9ab, 0xe4e1c7][i]);
      group.add(model);
      return {
        model,
        route: TRAFFIC_ROUTES[i % 2],
        distance: i * 43,
        speed: 3.8,
      };
    });
    this.update(0);
  }
  update(dt, player) {
    for (const car of this.cars) {
      const ahead = car.route.sample(car.distance + 3);
      const stop =
        player &&
        player.position.y < 2 &&
        Math.hypot(player.position.x - ahead.x, player.position.z - ahead.z) <
          2.6;
      car.distance += dt * (stop ? 0 : car.speed);
      const p = car.route.sample(car.distance);
      car.model.position.set(p.x, 0, p.z);
      const current = car.model.rotation.y;
      car.model.rotation.y +=
        Math.atan2(
          Math.sin(p.heading - current),
          Math.cos(p.heading - current),
        ) * (dt ? 1 - Math.exp(-9 * dt) : 1);
    }
  }
}
