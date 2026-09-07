import type { Rectangle } from './types';
import { checkAABBCollision } from './check-AABB-collision';
import { EMPTY_MAP_ROWS, BLOCK_SIZE, MAP_SIZE } from './constants';

const EXTRACTION_ZONE: Rectangle = {
  x: MAP_SIZE.width / 2,
  y: (EMPTY_MAP_ROWS * BLOCK_SIZE.height) / 2,
  width: MAP_SIZE.width,
  height: EMPTY_MAP_ROWS * BLOCK_SIZE.height,
};

/** An entity is considered "in the extraction zone" while their entire rectangle is within the designated area */
export const isInExtractionZone = (entity: Rectangle) => {
  const overlap = checkAABBCollision(entity, EXTRACTION_ZONE);
  if (!overlap) return false;

  return overlap.overlapX >= entity.width && overlap.overlapY >= entity.height;
};
