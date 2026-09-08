export const PLAYER_RADIUS = 0.36;
export const PLAYER_HEIGHT = 1.65;
export function overlapsCircle(x, z, radius, box) {
  const nx = Math.max(box.minX, Math.min(x, box.maxX));
  const nz = Math.max(box.minZ, Math.min(z, box.maxZ));
  return (x - nx) ** 2 + (z - nz) ** 2 < radius ** 2;
}
export function moveHorizontal(
  position,
  dx,
  dz,
  colliders,
  bounds,
  radius = PLAYER_RADIUS,
) {
  // Substeps prevent tunnelling during slow frames. Separate axes allow wall sliding.
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / (radius * 0.5)));
  const blocked = (x, z) =>
    colliders.some(
      (b) =>
        position.y < b.maxY &&
        position.y + PLAYER_HEIGHT > (b.minY ?? 0) &&
        overlapsCircle(x, z, radius, b),
    );
  for (let i = 0; i < steps; i++) {
    const x = Math.max(
      bounds.minX + radius,
      Math.min(bounds.maxX - radius, position.x + dx / steps),
    );
    if (!blocked(x, position.z)) position.x = x;
    const z = Math.max(
      bounds.minZ + radius,
      Math.min(bounds.maxZ - radius, position.z + dz / steps),
    );
    if (!blocked(position.x, z)) position.z = z;
  }
}
export function stepVertical(body, dt, trampoline, groundY = 0) {
  const previousY = body.position.y;
  body.velocityY -= 22 * dt;
  body.position.y += body.velocityY * dt;
  const overPad =
    trampoline &&
    Math.hypot(body.position.x - trampoline.x, body.position.z - trampoline.z) <
      trampoline.radius;
  if (
    overPad &&
    body.velocityY < 0 &&
    previousY >= trampoline.height &&
    body.position.y <= trampoline.height
  ) {
    body.position.y = trampoline.height;
    body.velocityY = 14;
    body.grounded = false;
    return "bounce";
  }
  if (body.position.y <= groundY) {
    const landed = !body.grounded;
    body.position.y = groundY;
    body.velocityY = 0;
    body.grounded = true;
    return landed ? "land" : null;
  }
  body.grounded = false;
  return null;
}
