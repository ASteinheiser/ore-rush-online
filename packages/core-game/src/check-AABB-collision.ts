import type { Rectangle } from './types';

interface AABBOverlap {
  overlapX: number;
  overlapY: number;
}

/** Returns axis overlap depths if colliding, or null if not. Assumes rectangles are centered on their x/y. */
export const checkAABBCollision = (rect1: Rectangle, rect2: Rectangle): AABBOverlap | null => {
  const overlapX = rect1.width / 2 + rect2.width / 2 - Math.abs(rect1.x - rect2.x);
  const overlapY = rect1.height / 2 + rect2.height / 2 - Math.abs(rect1.y - rect2.y);

  if (overlapX <= 0 || overlapY <= 0) return null;
  return { overlapX, overlapY };
};
