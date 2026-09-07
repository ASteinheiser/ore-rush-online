import { describe, it, expect } from 'vitest';
import { isInExtractionZone } from '../src/is-in-extraction-zone';
import { EMPTY_MAP_ROWS, BLOCK_SIZE, MAP_SIZE } from '../src/constants';

describe('isInExtractionZone', () => {
  const extractionZoneHeight = EMPTY_MAP_ROWS * BLOCK_SIZE.height;

  it('should return true when the entity is entirely within the extraction zone', () => {
    const entity = { x: MAP_SIZE.width / 2, y: extractionZoneHeight / 2, width: 32, height: 32 };

    expect(isInExtractionZone(entity)).toBe(true);
  });

  it('should return false when the entity is entirely below the extraction zone', () => {
    const entity = { x: MAP_SIZE.width / 2, y: extractionZoneHeight + 100, width: 32, height: 32 };

    expect(isInExtractionZone(entity)).toBe(false);
  });

  it('should return false when the entity is centered on the extraction zone boundary (y-axis)', () => {
    const entity = { x: MAP_SIZE.width / 2, y: extractionZoneHeight, width: 32, height: 32 };

    expect(isInExtractionZone(entity)).toBe(false);
  });

  it('should return true when the entity is fully inside but touching the bottom edge of the extraction zone', () => {
    const halfHeight = 16;
    const entity = { x: MAP_SIZE.width / 2, y: extractionZoneHeight - halfHeight, width: 32, height: 32 };

    expect(isInExtractionZone(entity)).toBe(true);
  });

  it('should return false when the entity is 1 px below the bottom edge of the extraction zone', () => {
    const halfHeight = 16;
    const entity = { x: MAP_SIZE.width / 2, y: extractionZoneHeight - halfHeight + 1, width: 32, height: 32 };

    expect(isInExtractionZone(entity)).toBe(false);
  });

  it('should return false when the entity is taller than the extraction zone itself', () => {
    const entity = {
      x: MAP_SIZE.width / 2,
      y: extractionZoneHeight / 2,
      width: 32,
      height: extractionZoneHeight + 1,
    };

    expect(isInExtractionZone(entity)).toBe(false);
  });
});
