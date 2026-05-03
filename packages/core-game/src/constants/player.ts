import { z } from 'zod';

/** The size of the player in pixels */
export const PLAYER_SIZE = {
  width: 64,
  height: 64,
} as const;
/** The radius of the player's view in pixels */
export const PLAYER_VIEW_RADIUS = 300;

/** The horizontal velocity of the player in pixels per tick */
export const PLAYER_VX_PER_TICK = 4;
/** Gravity: added to vertical velocity per fixed tick (positive = downward) */
export const PLAYER_GRAVITY_VY_PER_TICK = 0.35;
/** Upward thrust per tick while `up` is held (opposes gravity; enables flight) */
export const PLAYER_THRUST_VY_PER_TICK = 0.5;
/** Maximum downward speed per tick */
export const PLAYER_GRAVITY_VY_MAX = 16;
/** Maximum upward speed per tick */
export const PLAYER_THRUST_VY_MAX = 16;

/** The number of frames per second the player animates at (8fps) */
export const PLAYER_FRAME_RATE = 8;
/** Drill animation takes 0.375 seconds total (3 frames at 8fps) */
export const DRILL_COOLDOWN = 375;
/** The directions the player can drill */
export const DRILL_DIRECTIONS = {
  IDLE: 'idle',
  LEFT: 'left',
  RIGHT: 'right',
  DOWN: 'down',
} as const;
export type DRILL_DIRECTION = (typeof DRILL_DIRECTIONS)[keyof typeof DRILL_DIRECTIONS];

/** The inventory capacity of the player in "items" (each ore is 1 "item") */
export const PLAYER_INVENTORY_CAPACITY = 50;

/** The fuel capacity of the player in "units" */
export const PLAYER_FUEL_CAPACITY = 10000;
/** The fuel consumption rate of the player in "units" per movement action */
export const PLAYER_FUEL_CONSUMPTION_RATE_MOVEMENT = 1;
/** The fuel consumption rate of the player in "units" per drill action */
export const PLAYER_FUEL_CONSUMPTION_RATE_DRILL = 10;

/** The zod schema for player input */
export const InputSchema = z.object({
  seq: z.number().int().nonnegative(),
  left: z.boolean(),
  right: z.boolean(),
  up: z.boolean(),
  down: z.boolean(),
});
/** The payload for player input */
export type InputPayload = z.infer<typeof InputSchema>;
