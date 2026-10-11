// Shared by server (authoritative) and client (rendering). Coordinates: x, z on the floor; y is up.
export const MAX_PLAYERS = 8;
export const TICK_HZ = 20;
export const SPEED = { walk: 4, sprint: 7, crouch: 2 };
export const JUMP_V = 6.5, GRAVITY = 18, MAX_HP = 100, REVIVE_TIME = 3, REVIVE_RANGE = 2.2, REVIVE_HP = 40;
export const RADIUS = 0.4, WALL_H = 3.2;

// [centerX, centerZ, width, depth]
export const WALLS = [
  [0, 20.5, 42, 1], [0, -20.5, 42, 1], [20.5, 0, 1, 42], [-20.5, 0, 1, 42],
  [-11, 0, 18, 1], [11, 0, 18, 1],              // mid wall, gap at x in [-2,2] closed by DOOR
  [-14, 12, 1, 5], [14, 12, 1, 5], [0, -12, 1, 4]  // cover
];
export const DOOR = [0, 0, 4, 1];
export const PLATES = [[-8, 8], [8, 8]];      // both must be occupied at once (co-op puzzle)
export const PLATE_R = 1.6;
export const HAZARD = [0, -6, 14, 4];         // electrified floor, damages players
export const HAZARD_DPS = 18;
export const EXTRACT = [0, -16, 3.5];         // x, z, radius

export function hitsBox(x, z, b, r = RADIUS) {
  const nx = Math.max(b[0] - b[2] / 2, Math.min(x, b[0] + b[2] / 2));
  const nz = Math.max(b[1] - b[3] / 2, Math.min(z, b[1] + b[3] / 2));
  return (x - nx) ** 2 + (z - nz) ** 2 < r * r;
}
