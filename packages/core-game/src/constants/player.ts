import { z } from 'zod';

/** The size of the player in pixels */
export const PLAYER_SIZE = {
  width: 64,
  height: 64,
};
/** The radius of the player's view in pixels */
export const PLAYER_VIEW_RADIUS = 300;

/** The number of frames per second the player animates at (8fps) */
export const PLAYER_FRAME_RATE = 8;
/** Drill animation takes 0.375 seconds total (3 frames at 8fps) */
export const DRILL_COOLDOWN = 375;

/** The horizontal velocity of the player in pixels per tick */
export const PLAYER_VX_PER_TICK = 4;
/** Gravity: added to vertical velocity per fixed tick (positive = downward) */
export const PLAYER_GRAVITY_VY_PER_TICK = 0.35;
/** Upward thrust per tick while `up` is held (opposes gravity; enables flight) */
export const PLAYER_THRUST_VY_PER_TICK = 0.5;
/** Maximum downward speed per tick */
export const PLAYER_GRAVITY_VY_MAX = 24;
/** Maximum upward speed per tick */
export const PLAYER_THRUST_VY_MAX = 24;

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
