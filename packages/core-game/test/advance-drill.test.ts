import { describe, it, expect } from 'vitest';
import { advanceDrill } from '../src/advance-drill';
import { BLOCK_SIZE, DRILL_COOLDOWN, DRILL_DIRECTIONS, FIXED_TIME_STEP } from '../src/constants';

describe('advanceDrill', () => {
  const idleDrill = {
    drillDirection: DRILL_DIRECTIONS.IDLE,
    drillTargetCol: -1,
    drillTargetRow: -1,
    drillCooldownRemainingMs: 0,
  } as const;

  /** Center of grid cell (5, 10) — down-drill targets (5, 11) when grounded */
  const groundedOverCell5_10 = {
    x: 5 * BLOCK_SIZE.width + BLOCK_SIZE.width / 2,
    y: 10 * BLOCK_SIZE.height + BLOCK_SIZE.height / 2,
    isGrounded: true,
    isTouchingBlockLeft: false,
    isTouchingBlockRight: false,
  };

  const noInput = { down: false, left: false, right: false };

  describe('when starting a new drill', () => {
    it('should not start when not grounded even if a block is at the target cell', () => {
      const getBlockAt = (col: number, row: number) => (col === 5 && row === 11 ? { hp: 3 } : undefined);

      const result = advanceDrill({
        input: { down: true, left: false, right: false },
        state: {
          ...idleDrill,
          ...groundedOverCell5_10,
          isGrounded: false,
        },
        getBlockAt,
      });

      expect(result).toEqual({
        drillState: {
          drillDirection: DRILL_DIRECTIONS.IDLE,
          drillTargetCol: -1,
          drillTargetRow: -1,
          drillCooldownRemainingMs: 0,
        },
        drillCompletion: undefined,
      });
    });

    it('should not start when there is no block at the target cell', () => {
      const result = advanceDrill({
        input: { down: true, left: false, right: false },
        state: { ...idleDrill, ...groundedOverCell5_10 },
        getBlockAt: () => undefined,
      });

      expect(result.drillState).toEqual({
        drillDirection: DRILL_DIRECTIONS.IDLE,
        drillTargetCol: -1,
        drillTargetRow: -1,
        drillCooldownRemainingMs: 0,
      });
      expect(result.drillCompletion).toBeUndefined();
    });

    it('should start a downward drill with full cooldown when grounded and a block is below', () => {
      const getBlockAt = (col: number, row: number) => (col === 5 && row === 11 ? { hp: 3 } : undefined);

      const result = advanceDrill({
        input: { down: true, left: false, right: false },
        state: { ...idleDrill, ...groundedOverCell5_10 },
        getBlockAt,
      });

      expect(result).toEqual({
        drillState: {
          drillDirection: DRILL_DIRECTIONS.DOWN,
          drillTargetCol: 5,
          drillTargetRow: 11,
          drillCooldownRemainingMs: DRILL_COOLDOWN,
        },
        drillCompletion: undefined,
      });
    });

    it('should give down priority over horizontal inputs', () => {
      const getBlockAt = (col: number, row: number) => {
        if (col === 5 && row === 11) return { hp: 2 };
        if (col === 4 && row === 10) return { hp: 2 };
        return undefined;
      };

      const result = advanceDrill({
        input: { down: true, left: true, right: false },
        state: {
          ...idleDrill,
          ...groundedOverCell5_10,
          isTouchingBlockLeft: true,
        },
        getBlockAt,
      });

      expect(result.drillState.drillDirection).toBe(DRILL_DIRECTIONS.DOWN);
      expect(result.drillState.drillTargetCol).toBe(5);
      expect(result.drillState.drillTargetRow).toBe(11);
    });

    it('should target the cell to the left when holding left while touching a block on the left', () => {
      const x = 5 * BLOCK_SIZE.width + BLOCK_SIZE.width / 2;
      const y = 10 * BLOCK_SIZE.height + BLOCK_SIZE.height / 2;

      const getBlockAt = (col: number, row: number) => (col === 4 && row === 10 ? { hp: 4 } : undefined);

      const result = advanceDrill({
        input: { down: false, left: true, right: false },
        state: {
          ...idleDrill,
          x,
          y,
          isGrounded: true,
          isTouchingBlockLeft: true,
          isTouchingBlockRight: false,
        },
        getBlockAt,
      });

      expect(result.drillState).toEqual({
        drillDirection: DRILL_DIRECTIONS.LEFT,
        drillTargetCol: 4,
        drillTargetRow: 10,
        drillCooldownRemainingMs: DRILL_COOLDOWN,
      });
      expect(result.drillCompletion).toBeUndefined();
    });

    it('should not start a horizontal drill when both left and right are held', () => {
      const result = advanceDrill({
        input: { down: false, left: true, right: true },
        state: {
          ...idleDrill,
          ...groundedOverCell5_10,
          isTouchingBlockLeft: true,
          isTouchingBlockRight: true,
        },
        getBlockAt: () => ({ hp: 1 }),
      });

      expect(result.drillState.drillDirection).toBe(DRILL_DIRECTIONS.IDLE);
    });
  });

  describe('while drill cooldown is active', () => {
    it('should reduce cooldown by the fixed time step when still holding the same drill input', () => {
      const getBlockAt = (col: number, row: number) => (col === 5 && row === 11 ? { hp: 3 } : undefined);

      const result = advanceDrill({
        input: { down: true, left: false, right: false },
        state: {
          ...groundedOverCell5_10,
          drillDirection: DRILL_DIRECTIONS.DOWN,
          drillTargetCol: 5,
          drillTargetRow: 11,
          drillCooldownRemainingMs: DRILL_COOLDOWN,
        },
        getBlockAt,
      });

      expect(result.drillCompletion).toBeUndefined();
      expect(result.drillState).toEqual({
        drillDirection: DRILL_DIRECTIONS.DOWN,
        drillTargetCol: 5,
        drillTargetRow: 11,
        drillCooldownRemainingMs: DRILL_COOLDOWN - FIXED_TIME_STEP,
      });
    });

    it('should cancel the drill and return idle when input is released mid-cooldown', () => {
      const getBlockAt = (col: number, row: number) => (col === 5 && row === 11 ? { hp: 3 } : undefined);

      const result = advanceDrill({
        input: noInput,
        state: {
          ...groundedOverCell5_10,
          drillDirection: DRILL_DIRECTIONS.DOWN,
          drillTargetCol: 5,
          drillTargetRow: 11,
          drillCooldownRemainingMs: DRILL_COOLDOWN - FIXED_TIME_STEP,
        },
        getBlockAt,
      });

      expect(result).toEqual({
        drillState: {
          drillDirection: DRILL_DIRECTIONS.IDLE,
          drillTargetCol: -1,
          drillTargetRow: -1,
          drillCooldownRemainingMs: 0,
        },
        drillCompletion: undefined,
      });
    });

    it('should cancel the drill when the target cell no longer matches the player', () => {
      const getBlockAt = (col: number, row: number) => (col === 5 && row === 11 ? { hp: 3 } : undefined);

      const result = advanceDrill({
        input: { down: true, left: false, right: false },
        state: {
          ...groundedOverCell5_10,
          x: groundedOverCell5_10.x + BLOCK_SIZE.width,
          drillDirection: DRILL_DIRECTIONS.DOWN,
          drillTargetCol: 5,
          drillTargetRow: 11,
          drillCooldownRemainingMs: 100,
        },
        getBlockAt,
      });

      expect(result.drillState).toEqual({
        drillDirection: DRILL_DIRECTIONS.IDLE,
        drillTargetCol: -1,
        drillTargetRow: -1,
        drillCooldownRemainingMs: 0,
      });
    });
  });

  describe('when cooldown completes', () => {
    it('should emit drillCompletion with hpAfter and return idle when input is not held', () => {
      const getBlockAt = (col: number, row: number) => (col === 5 && row === 11 ? { hp: 3 } : undefined);

      const result = advanceDrill({
        input: noInput,
        state: {
          ...groundedOverCell5_10,
          drillDirection: DRILL_DIRECTIONS.DOWN,
          drillTargetCol: 5,
          drillTargetRow: 11,
          drillCooldownRemainingMs: FIXED_TIME_STEP,
        },
        getBlockAt,
      });

      expect(result.drillCompletion).toEqual({
        col: 5,
        row: 11,
        hpAfter: 2,
      });
      expect(result.drillState).toEqual({
        drillDirection: DRILL_DIRECTIONS.IDLE,
        drillTargetCol: -1,
        drillTargetRow: -1,
        drillCooldownRemainingMs: 0,
      });
    });

    it('should start a new drill in the same tick when the block is still there and input is still held', () => {
      const getBlockAt = (col: number, row: number) => (col === 5 && row === 11 ? { hp: 3 } : undefined);

      const result = advanceDrill({
        input: { down: true, left: false, right: false },
        state: {
          ...groundedOverCell5_10,
          drillDirection: DRILL_DIRECTIONS.DOWN,
          drillTargetCol: 5,
          drillTargetRow: 11,
          drillCooldownRemainingMs: FIXED_TIME_STEP,
        },
        getBlockAt,
      });

      expect(result.drillCompletion).toEqual({
        col: 5,
        row: 11,
        hpAfter: 2,
      });
      expect(result.drillState).toEqual({
        drillDirection: DRILL_DIRECTIONS.DOWN,
        drillTargetCol: 5,
        drillTargetRow: 11,
        drillCooldownRemainingMs: DRILL_COOLDOWN,
      });
    });
  });
});
