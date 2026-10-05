import test from "node:test";
import assert from "node:assert/strict";
import { BeachBall } from "../shared/world/park-ball.js";

const mockGroup = () => ({ added: [], add(m) { this.added.push(m); } });
const mockPlayer = (x, z, speed = 0) => ({
  position: { x, y: 0, z, clone() { return { ...this }; } },
  actualSpeed: speed,
});

test("ball rests on the ground and stays in the park", () => {
  const ball = new BeachBall(mockGroup());
  for (let i = 0; i < 120; i++) ball.update(1 / 60, mockPlayer(0, 0));
  assert.ok(Math.abs(ball.mesh.position.y - ball.radius) < 0.01);
  assert.ok(ball.mesh.position.x >= 3 && ball.mesh.position.x <= 17);
  assert.ok(ball.mesh.position.z >= 0.6 && ball.mesh.position.z <= 17.4);
});

test("walking into the ball pushes it away", () => {
  const ball = new BeachBall(mockGroup());
  const startX = ball.mesh.position.x;
  // Player just west of the ball, walking east into it.
  for (let i = 0; i < 60; i++)
    ball.update(1 / 60, mockPlayer(startX - 1, 9, 4));
  assert.ok(
    ball.mesh.position.x > startX + 0.5,
    "ball moved east, x=" + ball.mesh.position.x,
  );
});

test("activate pops the ball upward", () => {
  const ball = new BeachBall(mockGroup());
  ball.activate();
  assert.ok(ball.vel.y > 4);
  ball.update(1 / 60, mockPlayer(0, 0));
  assert.ok(ball.mesh.position.y > ball.radius);
});

test("ball bounces instead of sinking", () => {
  const ball = new BeachBall(mockGroup());
  ball.mesh.position.y = 3;
  ball.vel.set(0, -8, 0);
  let minY = Infinity;
  for (let i = 0; i < 180; i++) {
    ball.update(1 / 60, mockPlayer(0, 0));
    minY = Math.min(minY, ball.mesh.position.y);
  }
  assert.ok(minY >= ball.radius - 0.01, "never below ground, minY=" + minY);
});

test("ball cannot leave the park", () => {
  const ball = new BeachBall(mockGroup());
  ball.vel.set(30, 0, 30);
  for (let i = 0; i < 240; i++) ball.update(1 / 60, mockPlayer(0, 0));
  const p = ball.mesh.position;
  assert.ok(p.x >= 3 && p.x <= 17 && p.z >= 0.6 && p.z <= 17.4);
});
