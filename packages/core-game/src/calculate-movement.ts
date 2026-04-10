import type { Rectangle, EntityPosition } from './types';
import { checkAABBCollision } from './check-AABB-collision';
import {
  MAP_SIZE,
  EDGE_COLLISION_TOLERANCE,
  PLAYER_VX_PER_TICK,
  PLAYER_GRAVITY_VY_PER_TICK,
  PLAYER_THRUST_VY_PER_TICK,
  PLAYER_GRAVITY_VY_MAX,
  PLAYER_THRUST_VY_MAX,
} from './constants';

/** Clamps a value between a minimum and maximum */
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export interface MovementInput {
  left: boolean;
  right: boolean;
  up: boolean;
}
interface MovementVelocity {
  velocityY: number;
}
interface MovementWalls {
  blocks: Rectangle[];
}
interface MovementCollision {
  isGrounded: boolean;
  isTouchingBlockLeft: boolean;
  isTouchingBlockRight: boolean;
}

export type CalculateMovementArgs = Rectangle & MovementInput & MovementVelocity & MovementWalls;
export type CalculateMovementResult = EntityPosition & MovementVelocity & MovementCollision;

export const calculateMovement = ({
  x,
  y,
  width,
  height,
  velocityY,
  blocks,
  left,
  right,
  up,
}: CalculateMovementArgs): CalculateMovementResult => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  let newX = x;
  let newY = y;
  let newVelocityY = velocityY;
  let isGrounded = false;
  let isTouchingBlockLeft = false;
  let isTouchingBlockRight = false;
  /** Set when the horizontal pass nudges Y to avoid a corner (tells the vertical pass to skip nudges) */
  let didEdgeCorrect = false;

  /** Handles whether the entity can nudge to a new position */
  const canNudge = (nudgeX: number, nudgeY: number, exclude: Rectangle) =>
    !blocks.some(
      (other) =>
        other !== exclude && checkAABBCollision({ x: nudgeX, y: nudgeY, width, height }, other) !== null
    );

  // Horizontal movement (left and right cancel out)
  if (left !== right) {
    if (left) newX -= PLAYER_VX_PER_TICK;
    if (right) newX += PLAYER_VX_PER_TICK;
  }

  // Resolve horizontal block collisions (using pre-movement Y to avoid false positives)
  for (const block of blocks) {
    const overlap = checkAABBCollision({ x: newX, y, width, height }, block);
    if (!overlap) continue;

    if (overlap.overlapY < EDGE_COLLISION_TOLERANCE) {
      const nudgeUp = y < block.y;
      const nudgeOpposesVelocity = nudgeUp ? velocityY >= 0 : velocityY < 0;

      // if Y nudge would fight velocity and X overlap is tiny,
      // skip nudge to prevent sticking to edges when falling/flying
      if (nudgeOpposesVelocity && overlap.overlapX < EDGE_COLLISION_TOLERANCE) continue;

      const nudgedY = newY + (nudgeUp ? -overlap.overlapY : overlap.overlapY);
      if (canNudge(newX, nudgedY, block)) {
        didEdgeCorrect = true;
        newY = nudgedY;
        continue;
      }
    }

    if (newX > block.x) {
      newX = block.x + block.width / 2 + halfWidth;
      isTouchingBlockLeft = true;
    } else {
      newX = block.x - block.width / 2 - halfWidth;
      isTouchingBlockRight = true;
    }
  }

  // Vertical movement: gravity + thrust
  newVelocityY += PLAYER_GRAVITY_VY_PER_TICK;
  if (up) newVelocityY -= PLAYER_THRUST_VY_PER_TICK;

  newVelocityY = clamp(newVelocityY, -PLAYER_THRUST_VY_MAX, PLAYER_GRAVITY_VY_MAX);
  newY += newVelocityY;

  // Resolve vertical block collisions (using resolved X)
  for (const block of blocks) {
    const overlap = checkAABBCollision({ x: newX, y: newY, width, height }, block);
    if (!overlap) continue;

    if (overlap.overlapX < EDGE_COLLISION_TOLERANCE) {
      // if horizontal pass already nudged Y and entity has vertical momentum,
      // skip this nudge to avoid undoing the previous nudge
      if (didEdgeCorrect && velocityY !== 0) continue;

      const nudgeLeft = newX < block.x;
      const nudgedX = newX + (nudgeLeft ? -overlap.overlapX : overlap.overlapX);
      if (canNudge(nudgedX, newY, block)) {
        newX = nudgedX;
        continue;
      }
    }

    if (newVelocityY >= 0) {
      newY = block.y - block.height / 2 - halfHeight;
      isGrounded = true;
    } else {
      newY = block.y + block.height / 2 + halfHeight;
    }
    newVelocityY = 0;
  }

  // Map boundary enforcement
  const minX = halfWidth;
  const maxX = MAP_SIZE.width - halfWidth;
  const minY = halfHeight;
  const maxY = MAP_SIZE.height - halfHeight;

  newX = clamp(newX, minX, maxX);

  if (newY < minY) {
    newY = minY;
    newVelocityY = 0;
  }
  if (newY > maxY) {
    newY = maxY;
    newVelocityY = 0;
    isGrounded = true;
  }

  return {
    x: newX,
    y: newY,
    velocityY: newVelocityY,
    isGrounded,
    isTouchingBlockLeft,
    isTouchingBlockRight,
  };
};
