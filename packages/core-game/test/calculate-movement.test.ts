import { describe, it, expect } from 'vitest';
import { calculateMovement } from '../src/calculate-movement';
import {
  MAP_SIZE,
  EDGE_COLLISION_TOLERANCE,
  PLAYER_VX_PER_TICK,
  PLAYER_GRAVITY_VY_PER_TICK,
  PLAYER_THRUST_VY_PER_TICK,
  PLAYER_GRAVITY_VY_MAX,
  PLAYER_THRUST_VY_MAX,
} from '../src/constants';

describe('calculateMovement', () => {
  const noInput = { left: false, right: false, up: false };
  const noBlocks = { blocks: [] };
  const noSize = { width: 0, height: 0 };
  const center = { x: MAP_SIZE.width / 2, y: MAP_SIZE.height / 2 };

  describe('when no walls exist', () => {
    describe('gravity', () => {
      it('should apply downward acceleration each tick', () => {
        const result = calculateMovement({
          ...center,
          ...noSize,
          ...noInput,
          ...noBlocks,
          velocityY: 0,
        });

        expect(result).toEqual({
          x: center.x,
          y: center.y + PLAYER_GRAVITY_VY_PER_TICK,
          velocityY: PLAYER_GRAVITY_VY_PER_TICK,
          isGrounded: false,
          isTouchingBlockLeft: false,
          isTouchingBlockRight: false,
        });
      });

      it('should accumulate with existing downward velocity', () => {
        const velocityY = 5;
        const expectedVY = velocityY + PLAYER_GRAVITY_VY_PER_TICK;

        const result = calculateMovement({
          ...center,
          ...noSize,
          ...noInput,
          ...noBlocks,
          velocityY,
        });

        expect(result).toEqual({
          x: center.x,
          y: center.y + expectedVY,
          velocityY: expectedVY,
          isGrounded: false,
          isTouchingBlockLeft: false,
          isTouchingBlockRight: false,
        });
      });

      it('should clamp at terminal downward velocity', () => {
        const result = calculateMovement({
          ...center,
          ...noSize,
          ...noInput,
          ...noBlocks,
          velocityY: PLAYER_GRAVITY_VY_MAX,
        });

        expect(result).toEqual({
          x: center.x,
          y: center.y + PLAYER_GRAVITY_VY_MAX,
          velocityY: PLAYER_GRAVITY_VY_MAX,
          isGrounded: false,
          isTouchingBlockLeft: false,
          isTouchingBlockRight: false,
        });
      });
    });

    describe('thrust', () => {
      it('should oppose gravity when up is pressed', () => {
        const expectedVY = PLAYER_GRAVITY_VY_PER_TICK - PLAYER_THRUST_VY_PER_TICK;

        const result = calculateMovement({
          ...center,
          ...noSize,
          ...noInput,
          ...noBlocks,
          up: true,
          velocityY: 0,
        });

        expect(result).toEqual({
          x: center.x,
          y: center.y + expectedVY,
          velocityY: expectedVY,
          isGrounded: false,
          isTouchingBlockLeft: false,
          isTouchingBlockRight: false,
        });
      });

      it('should clamp at terminal upward velocity', () => {
        const result = calculateMovement({
          ...center,
          ...noSize,
          ...noInput,
          ...noBlocks,
          up: true,
          velocityY: -PLAYER_THRUST_VY_MAX,
        });

        expect(result).toEqual({
          x: center.x,
          y: center.y - PLAYER_THRUST_VY_MAX,
          velocityY: -PLAYER_THRUST_VY_MAX,
          isGrounded: false,
          isTouchingBlockLeft: false,
          isTouchingBlockRight: false,
        });
      });
    });

    describe('horizontal movement', () => {
      it('should move left', () => {
        const result = calculateMovement({
          ...center,
          ...noSize,
          ...noInput,
          ...noBlocks,
          left: true,
          velocityY: 0,
        });

        expect(result.x).toBe(center.x - PLAYER_VX_PER_TICK);
      });

      it('should move right', () => {
        const result = calculateMovement({
          ...center,
          ...noSize,
          ...noInput,
          ...noBlocks,
          right: true,
          velocityY: 0,
        });

        expect(result.x).toBe(center.x + PLAYER_VX_PER_TICK);
      });

      it('should cancel when both left and right are pressed', () => {
        const result = calculateMovement({
          ...center,
          ...noSize,
          ...noInput,
          ...noBlocks,
          left: true,
          right: true,
          velocityY: 0,
        });

        expect(result.x).toBe(center.x);
      });
    });

    it('should apply horizontal and vertical movement independently', () => {
      const expectedVY = PLAYER_GRAVITY_VY_PER_TICK - PLAYER_THRUST_VY_PER_TICK;

      const result = calculateMovement({
        ...center,
        ...noSize,
        ...noInput,
        ...noBlocks,
        left: true,
        up: true,
        velocityY: 0,
      });

      expect(result).toEqual({
        x: center.x - PLAYER_VX_PER_TICK,
        y: center.y + expectedVY,
        velocityY: expectedVY,
        isGrounded: false,
        isTouchingBlockLeft: false,
        isTouchingBlockRight: false,
      });
    });
  });

  describe('when walls exist', () => {
    const entitySize = { width: 64, height: 64 };
    const block = { ...center, ...entitySize };
    const halfBlock = block.width / 2;
    const halfEntity = entitySize.width / 2;

    describe('vertical collisions', () => {
      it('should stay grounded when sitting on top of a block', () => {
        const standingY = block.y - halfBlock - halfEntity;

        const result = calculateMovement({
          x: block.x,
          y: standingY,
          ...entitySize,
          ...noInput,
          velocityY: 0,
          blocks: [block],
        });

        expect(result).toEqual({
          x: block.x,
          y: standingY,
          velocityY: 0,
          isGrounded: true,
          isTouchingBlockLeft: false,
          isTouchingBlockRight: false,
        });
      });

      it('should snap to the top of a block when falling onto it', () => {
        const startY = block.y - halfBlock - halfEntity - 5;
        const landingY = block.y - halfBlock - halfEntity;

        const result = calculateMovement({
          x: block.x,
          y: startY,
          ...entitySize,
          ...noInput,
          velocityY: 10,
          blocks: [block],
        });

        expect(result).toEqual({
          x: block.x,
          y: landingY,
          velocityY: 0,
          isGrounded: true,
          isTouchingBlockLeft: false,
          isTouchingBlockRight: false,
        });
      });

      it('should stop upward velocity when hitting a block from below', () => {
        const startY = block.y + halfBlock + halfEntity;

        const result = calculateMovement({
          x: block.x,
          y: startY,
          ...entitySize,
          ...noInput,
          up: true,
          velocityY: -5,
          blocks: [block],
        });

        expect(result).toEqual({
          x: block.x,
          y: startY,
          velocityY: 0,
          isGrounded: false,
          isTouchingBlockLeft: false,
          isTouchingBlockRight: false,
        });
      });
    });

    describe('horizontal collisions', () => {
      it('should stop and report isTouchingBlockRight when moving into a block on the right', () => {
        const startX = block.x - halfBlock - halfEntity;

        const result = calculateMovement({
          x: startX,
          y: block.y,
          ...entitySize,
          ...noInput,
          right: true,
          velocityY: 0,
          blocks: [block],
        });

        expect(result.x).toBe(startX);
        expect(result.isTouchingBlockRight).toBe(true);
        expect(result.isTouchingBlockLeft).toBe(false);
      });

      it('should stop and report isTouchingBlockLeft when moving into a block on the left', () => {
        const startX = block.x + halfBlock + halfEntity;

        const result = calculateMovement({
          x: startX,
          y: block.y,
          ...entitySize,
          ...noInput,
          left: true,
          velocityY: 0,
          blocks: [block],
        });

        expect(result.x).toBe(startX);
        expect(result.isTouchingBlockLeft).toBe(true);
        expect(result.isTouchingBlockRight).toBe(false);
      });
    });

    describe('edge correction', () => {
      it('should nudge vertically to slide past a block corner during horizontal movement', () => {
        // 4px vertical overlap with the top of the block while moving right with upward velocity.
        // The horizontal pass nudges the entity up to clear the corner instead of stopping it.
        const entityY = block.y - halfBlock - halfEntity + EDGE_COLLISION_TOLERANCE / 2;
        // Close enough to the block that moving right creates a horizontal overlap
        const approachX = block.x - halfBlock - halfEntity + EDGE_COLLISION_TOLERANCE / 2;

        const result = calculateMovement({
          x: approachX,
          y: entityY,
          ...entitySize,
          ...noInput,
          right: true,
          velocityY: -2,
          blocks: [block],
        });

        expect(result.x).toBeGreaterThan(approachX);
        expect(result.isTouchingBlockRight).toBe(false);
        expect(result.isTouchingBlockLeft).toBe(false);
      });

      it('should nudge horizontally to slide past a block corner during vertical movement', () => {
        // 4px horizontal overlap with the right side of the block while falling.
        // The vertical pass nudges the entity right to avoid landing on the block.
        const entityX = block.x + halfBlock + halfEntity - EDGE_COLLISION_TOLERANCE / 2;
        // Above the block so the horizontal pass misses, but close enough that falling brings it into range
        const approachY = block.y - halfBlock - halfEntity - EDGE_COLLISION_TOLERANCE / 2;

        const result = calculateMovement({
          x: entityX,
          y: approachY,
          ...entitySize,
          ...noInput,
          velocityY: 10,
          blocks: [block],
        });

        expect(result.x).toBeGreaterThan(entityX);
        expect(result.isGrounded).toBe(false);
        expect(result.isTouchingBlockLeft).toBe(false);
        expect(result.isTouchingBlockRight).toBe(false);
      });
    });
  });

  describe('when entity is at the edge of the map', () => {
    it('should clamp to minimum bounds when far out of bounds', () => {
      const result = calculateMovement({
        x: -100,
        y: -100,
        ...noSize,
        ...noInput,
        ...noBlocks,
        velocityY: 0,
      });

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
      expect(result.velocityY).toBe(0);
      expect(result.isGrounded).toBe(false);
    });

    it('should clamp to maximum bounds and set isGrounded when far out of bounds', () => {
      const result = calculateMovement({
        x: MAP_SIZE.width + 100,
        y: MAP_SIZE.height + 100,
        ...noSize,
        ...noInput,
        ...noBlocks,
        velocityY: 0,
      });

      expect(result.x).toBe(MAP_SIZE.width);
      expect(result.y).toBe(MAP_SIZE.height);
      expect(result.velocityY).toBe(0);
      expect(result.isGrounded).toBe(true);
    });

    it('should reset velocityY without setting isGrounded when hitting the top boundary', () => {
      const result = calculateMovement({
        x: center.x,
        y: 0,
        ...noSize,
        ...noInput,
        ...noBlocks,
        velocityY: -PLAYER_THRUST_VY_MAX,
      });

      expect(result.y).toBe(0);
      expect(result.velocityY).toBe(0);
      expect(result.isGrounded).toBe(false);
    });

    it('should prevent movement beyond the left boundary', () => {
      const result = calculateMovement({
        x: 0,
        y: center.y,
        ...noSize,
        ...noInput,
        ...noBlocks,
        left: true,
        velocityY: 0,
      });

      expect(result.x).toBe(0);
    });

    it('should prevent movement beyond the right boundary', () => {
      const result = calculateMovement({
        x: MAP_SIZE.width,
        y: center.y,
        ...noSize,
        ...noInput,
        ...noBlocks,
        right: true,
        velocityY: 0,
      });

      expect(result.x).toBe(MAP_SIZE.width);
    });

    describe('with a sized entity', () => {
      it('should offset boundaries by half the entity size (50x50)', () => {
        const size = { width: 50, height: 50 };

        const bottomRight = calculateMovement({
          x: MAP_SIZE.width,
          y: MAP_SIZE.height,
          ...size,
          ...noInput,
          ...noBlocks,
          velocityY: 0,
        });
        expect(bottomRight.x).toBe(MAP_SIZE.width - 25);
        expect(bottomRight.y).toBe(MAP_SIZE.height - 25);
        expect(bottomRight.velocityY).toBe(0);
        expect(bottomRight.isGrounded).toBe(true);

        const topLeft = calculateMovement({
          x: 0,
          y: 0,
          ...size,
          ...noInput,
          ...noBlocks,
          velocityY: 0,
        });
        expect(topLeft.x).toBe(25);
        expect(topLeft.y).toBe(25);
        expect(topLeft.velocityY).toBe(0);
        expect(topLeft.isGrounded).toBe(false);
      });

      it('should offset boundaries by half the entity size (37x96)', () => {
        const size = { width: 37, height: 96 };

        const bottomRight = calculateMovement({
          x: MAP_SIZE.width,
          y: MAP_SIZE.height,
          ...size,
          ...noInput,
          ...noBlocks,
          velocityY: 0,
        });
        expect(bottomRight.x).toBe(MAP_SIZE.width - 18.5);
        expect(bottomRight.y).toBe(MAP_SIZE.height - 48);
        expect(bottomRight.velocityY).toBe(0);
        expect(bottomRight.isGrounded).toBe(true);

        const topLeft = calculateMovement({
          x: 0,
          y: 0,
          ...size,
          ...noInput,
          ...noBlocks,
          velocityY: 0,
        });
        expect(topLeft.x).toBe(18.5);
        expect(topLeft.y).toBe(48);
        expect(topLeft.velocityY).toBe(0);
        expect(topLeft.isGrounded).toBe(false);
      });
    });
  });
});
