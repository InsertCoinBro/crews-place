import { makeCharacter } from "./models.js";
import { Route } from "./routes.js";
export const NPC_ROUTES = [
  new Route([
    [-19, -19],
    [19, -19],
    [19, 19],
    [-19, 19],
  ]),
  new Route([
    [-17, -3],
    [0, -3],
    [0, 17],
    [0, -3],
  ]),
  new Route([
    [3, 15],
    [16, 15],
    [16, 12],
    [3, 12],
  ]),
];
export class NPCs {
  constructor(group) {
    this.people = Array.from({ length: 7 }, (_, i) => {
      const model = makeCharacter(
        [0xc98e90, 0x709eab, 0xc7ac6c, 0xa69bbe][i % 4],
      );
      model.scale.setScalar(0.85 + (i % 2) * 0.12);
      group.add(model);
      return {
        model,
        route: NPC_ROUTES[i % 3],
        distance: i * 19,
        speed: 0.8 + (i % 3) * 0.12,
      };
    });
    this.update(0);
  }
  update(dt, player) {
    for (const person of this.people) {
      const ahead = person.route.sample(person.distance + 0.7);
      const stop =
        player &&
        player.position.y < 2 &&
        Math.hypot(player.position.x - ahead.x, player.position.z - ahead.z) <
          1;
      person.distance += stop ? 0 : dt * person.speed;
      const p = person.route.sample(person.distance);
      person.model.position.set(p.x, 0, p.z);
      person.model.rotation.y = p.heading;
      const swing = stop ? 0 : Math.sin(person.distance * 6) * 0.45;
      person.model.userData.leftLeg.rotation.x = swing;
      person.model.userData.rightLeg.rotation.x = -swing;
      person.model.userData.leftArm.rotation.x = -swing * 0.7;
      person.model.userData.rightArm.rotation.x = swing * 0.7;
    }
  }
}
