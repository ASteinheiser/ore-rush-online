import type { Rectangle, EntityPosition } from './types';
import {
  MAP_SIZE,
  PLAYER_VX_PER_TICK,
  PLAYER_GRAVITY_VY_PER_TICK,
  PLAYER_THRUST_VY_PER_TICK,
  PLAYER_GRAVITY_VY_MAX,
  PLAYER_THRUST_VY_MAX,
} from './constants';

export interface MovementInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
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

  // Horizontal movement (left and right cancel out)
  if (left !== right) {
    if (left) newX -= PLAYER_VX_PER_TICK;
    if (right) newX += PLAYER_VX_PER_TICK;
  }

  // Resolve horizontal block collisions (using pre-movement Y to avoid false positives)
  for (const block of blocks) {
    const bHalfW = block.width / 2;
    const bHalfH = block.height / 2;

    const overlapsX = newX - halfWidth < block.x + bHalfW && newX + halfWidth > block.x - bHalfW;
    const overlapsY = y - halfHeight < block.y + bHalfH && y + halfHeight > block.y - bHalfH;

    if (overlapsX && overlapsY) {
      if (newX > block.x) {
        newX = block.x + bHalfW + halfWidth;
        isTouchingBlockLeft = true;
      } else {
        newX = block.x - bHalfW - halfWidth;
        isTouchingBlockRight = true;
      }
    }
  }

  // Vertical movement: gravity + thrust
  newVelocityY += PLAYER_GRAVITY_VY_PER_TICK;
  if (up) newVelocityY -= PLAYER_THRUST_VY_PER_TICK;

  newVelocityY = Math.max(-PLAYER_THRUST_VY_MAX, Math.min(PLAYER_GRAVITY_VY_MAX, newVelocityY));
  newY += newVelocityY;

  // Resolve vertical block collisions (using resolved X)
  for (const block of blocks) {
    const bHalfW = block.width / 2;
    const bHalfH = block.height / 2;

    const overlapsX = newX - halfWidth < block.x + bHalfW && newX + halfWidth > block.x - bHalfW;
    const overlapsY = newY - halfHeight < block.y + bHalfH && newY + halfHeight > block.y - bHalfH;

    if (overlapsX && overlapsY) {
      if (newVelocityY > 0) {
        newY = block.y - bHalfH - halfHeight;
        isGrounded = true;
      } else {
        newY = block.y + bHalfH + halfHeight;
      }
      newVelocityY = 0;
    }
  }

  // Map boundary enforcement
  const minX = halfWidth;
  const maxX = MAP_SIZE.width - halfWidth;
  const minY = halfHeight;
  const maxY = MAP_SIZE.height - halfHeight;

  newX = Math.max(minX, Math.min(maxX, newX));

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
