import { BLOCK_SIZE } from './block';

/** How long each tick takes in ms (64fps = 15.625ms) */
export const FIXED_TIME_STEP = 1000 / 64;

/** The size of the map in pixels */
export const MAP_SIZE = {
  width: 4000,
  height: 4000,
};

/** The size of the map in grid columns and rows */
export const MAP_GRID_SIZE = {
  cols: Math.ceil(MAP_SIZE.width / BLOCK_SIZE.width),
  rows: Math.ceil(MAP_SIZE.height / BLOCK_SIZE.height),
};

/** The number of rows at the top of the map that are empty (used as a spawn area) */
export const EMPTY_MAP_ROWS = 2;

/** The tolerance for edge collisions (in pixels) */
export const EDGE_COLLISION_TOLERANCE = 8;
