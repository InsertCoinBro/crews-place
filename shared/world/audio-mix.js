import { SOURCES } from "./audio-sources.js";
import { FARM_ANIMALS } from "./farm.js";

const unit = (v) => Math.max(0, Math.min(1, v));

export function mixWorldAudio(game, weather) {
  const a = game.audio;
  if (game.mode !== "playing") {
    a.stopAll();
    return;
  }
  a.duck = game.farm.current ? 0.22 : 1;
  const listener = game.player.position;
  const outdoors =
    game.area.id === "town" && !game.area.interior && !game.spaceDive.occupied;
  const riding =
    game.coaster.occupied || game.spaceDive.occupied || game.flying;
  const local = outdoors && !riding;
  a.proximity(
    "fountain",
    local ? { x: -8, y: 0, z: 2.5 } : null,
    listener,
    20,
    0.55,
  );
  a.animal(
    "meadowHorse",
    "horse",
    local ? game.wildlife.horse?.model.position : null,
    listener,
    16,
    0.7,
  );
  game.farm.animals.forEach((model, index) => {
    const species = FARM_ANIMALS[index].id;
    a.animal(
      "farm-" + species,
      species,
      local ? model.position : null,
      listener,
      species === "rabbit" ? 8 : 14,
      species === "rabbit" ? 0.35 : 0.7,
    );
  });

  const traffic =
    local && !game.driving
      ? game.traffic.cars.reduce((nearest, car) => {
          const p = car.model.position;
          return !nearest ||
            Math.hypot(p.x - listener.x, p.z - listener.z) <
              Math.hypot(nearest.x - listener.x, nearest.z - listener.z)
            ? p
            : nearest;
        }, null)
      : null;
  a.proximity("traffic", traffic, listener, 18, 0.45, SOURCES.carRoad);
  const speed = unit(Math.abs(game.vehicle.speed) / 12);
  a.setLoop(
    "carEngine",
    game.driving,
    0.55 + speed * 0.15,
    SOURCES.carEngine,
    0.9 + speed * 0.65,
  );
  a.setLoop(
    "carRoad",
    game.driving && speed > 0.02,
    speed * 0.38,
    SOURCES.carRoad,
    0.8 + speed * 0.35,
  );
  const tractorSpeed = unit(Math.abs(game.cornMaze.audioSpeed ?? 0) / 7);
  a.setLoop(
    "tractorEngine",
    game.cornMaze.occupied,
    0.5 + tractorSpeed * 0.15,
    SOURCES.tractorEngine,
    0.85 + tractorSpeed * 0.4,
  );

  a.setLoop("rain", outdoors, weather.rain * 0.48, SOURCES.rain, 1, "ambience");
  // Falling snow is almost silent; use a soft outdoor breeze, not synthetic hiss.
  const wind = unit(Math.hypot(weather.windX, weather.windZ) / 5);
  a.setLoop(
    "wind",
    outdoors,
    Math.max(wind * 0.28, weather.snow * 0.1),
    SOURCES.wind,
    1,
    "ambience",
  );

  const ride = game.playground.active;
  a.setLoop(
    "swing",
    ride === "swing",
    0.35,
    SOURCES.swing,
    0.75 + game.playground.speed * 0.4,
  );
  a.setLoop(
    "spinner",
    ride === "spinner",
    0.2,
    SOURCES.spinner,
    0.65 + game.playground.speed * 0.4,
  );
  a.setLoop(
    "slide",
    ride === "slide" && game.playground.time >= 4,
    0.28,
    SOURCES.slide,
  );

  const coaster = game.coaster.ride;
  const running = coaster.state === "riding";
  const roll = unit(coaster.speed / 29);
  a.setLoop(
    "coasterWheels",
    running,
    0.25 + roll * 0.4,
    SOURCES.coasterWheels,
    0.65 + roll * 0.7,
  );
  a.setLoop(
    "coasterRatchet",
    running && coaster.phase === "Climbing to the sky",
    0.4,
  );
  a.setLoop(
    "coasterWind",
    running && roll > 0.3,
    roll * 0.28,
    SOURCES.rideWind,
  );
  const dive = game.spaceDive.ride;
  const rush = unit(dive.speed / 66);
  a.setLoop(
    "spaceDiveWheels",
    dive.state === "riding",
    0.2 + rush * 0.25,
    SOURCES.coasterWheels,
    0.65 + rush * 0.6,
  );
  a.setLoop(
    "spaceDiveWind",
    dive.state === "riding",
    rush * 0.55,
    SOURCES.rideWind,
    0.85 + rush * 0.3,
  );
  // Braking naturally winds both loops down with vehicle speed, without a repeating impact.
  a.setLoop(
    "spaceship",
    game.spaceship.occupied,
    0.16 + unit(Math.abs(game.spaceship.speed) / 25) * 0.12,
    SOURCES.spaceEngine,
    0.7 + unit(Math.abs(game.spaceship.speed) / 25) * 0.25,
  );
  a.setLoop(
    "plane",
    game.flying,
    0.45 + unit(game.plane.speed / 30) * 0.12,
    SOURCES.plane,
    0.85 + unit(game.plane.speed / 30) * 0.35,
  );
  a.setLoop("rocket", false);
}

export function mixRocketAudio(game) {
  const a = game.audio;
  a.duck = 1;
  const thrust = game.mode === "rocket" ? (game.rocket.audioThrust ?? 0) : 0;
  a.setLoop(
    "rocket",
    thrust > 0.01,
    0.55 * thrust,
    SOURCES.rocket,
    0.9 + thrust * 0.1,
  );
}
