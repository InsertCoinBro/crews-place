// North is negative Z. The west meadow accommodates the farm corn maze.
export const NORTH_EXTENSION = 2400;
export const WORLD_BOUNDS = Object.freeze({
  minX: -244,
  maxX: 90,
  minZ: -2490,
  maxZ: 104,
});
export const NORTH_AIRFIELD_SITE = Object.freeze({
  x: 52,
  z: -2200,
  width: 42,
  depth: 176,
  runwayStart: Object.freeze({ x: 52, z: -2120 }),
  runwayEnd: Object.freeze({ x: 52, z: -2280 }),
  hangar: Object.freeze({ x: 72, z: -2182 }),
  name: "North Meadow Airfield",
});
