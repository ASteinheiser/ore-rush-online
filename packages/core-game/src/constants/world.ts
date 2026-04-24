import { BLOCK_SIZE } from './block';

/** How many ticks of game logic occur per second */
export const TICKS_PER_SECOND = 64;
/** How long each tick takes in ms (64fps = 15.625ms) */
export const FIXED_TIME_STEP = 1000 / TICKS_PER_SECOND;

/** The size of the map in grid columns and rows */
export const MAP_GRID_SIZE = {
  cols: 64,
  rows: 64,
} as const;

/** The size of the map in pixels */
export const MAP_SIZE = {
  width: BLOCK_SIZE.width * MAP_GRID_SIZE.cols,
  height: BLOCK_SIZE.height * MAP_GRID_SIZE.rows,
} as const;

/** The number of rows at the top of the map that are empty (used as a spawn area) */
export const EMPTY_MAP_ROWS = 2;

/** The tolerance for edge collisions (in pixels) */
export const EDGE_COLLISION_TOLERANCE = 8;
