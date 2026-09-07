import type { Rectangle } from './types';
import { EMPTY_MAP_ROWS, BLOCK_SIZE } from './constants';

/** An entity is consider "in the extraction zone" while their entire reactangle is within the designated area */
export const isInExtractionZone = (entity: Rectangle) => {
  const extractionZoneHeight = EMPTY_MAP_ROWS * BLOCK_SIZE.height;
  return entity.y < extractionZoneHeight;
};
