import { BLOCK_SIZE } from './constants/block';
import {
  DRILL_COOLDOWN_TICKS,
  DRILL_DIRECTIONS,
  type DRILL_DIRECTION,
  type InputPayload,
} from './constants/player';

type DrillInput = Pick<InputPayload, 'down' | 'left' | 'right'>;

interface AdvanceDrillArgs {
  input: DrillInput;
  state: DrillState & PlayerState;
  getBlockAt: (col: number, row: number) => { hp: number } | undefined;
}

interface AdvanceDrillResult {
  drillState: DrillState;
  drillCompletion?: DrillCompletion;
}

interface DrillState {
  drillDirection: DRILL_DIRECTION;
  drillTargetCol: number;
  drillTargetRow: number;
  drillCooldownRemainingTicks: number;
}

interface PlayerState {
  x: number;
  y: number;
  isGrounded: boolean;
  isTouchingBlockLeft: boolean;
  isTouchingBlockRight: boolean;
}

interface DrillCompletion {
  col: number;
  row: number;
  hpAfter: number;
}

const idleState = (): DrillState => ({
  drillDirection: DRILL_DIRECTIONS.IDLE,
  drillTargetCol: -1,
  drillTargetRow: -1,
  drillCooldownRemainingTicks: 0,
});

/** Handles one fixed-tick step of input processing for drilling */
export const advanceDrill = ({ input, state, getBlockAt }: AdvanceDrillArgs): AdvanceDrillResult => {
  let workingState: DrillState = {
    drillDirection: state.drillDirection,
    drillTargetCol: state.drillTargetCol,
    drillTargetRow: state.drillTargetRow,
    drillCooldownRemainingTicks: state.drillCooldownRemainingTicks,
  };
  let drillCompletion: DrillCompletion | undefined;

  if (workingState.drillCooldownRemainingTicks > 0) {
    const remainingTicks = workingState.drillCooldownRemainingTicks - 1;

    if (remainingTicks > 0) {
      if (
        !isStillHoldingDrill(input, workingState.drillDirection, state.isGrounded) ||
        !isTargetUnchanged(state)
      ) {
        return { drillState: idleState() };
      }
      return { drillState: { ...workingState, drillCooldownRemainingTicks: remainingTicks } };
    }
    workingState.drillCooldownRemainingTicks = 0;
  }

  if (
    workingState.drillDirection !== DRILL_DIRECTIONS.IDLE &&
    workingState.drillTargetCol >= 0 &&
    workingState.drillTargetRow >= 0
  ) {
    if (isTargetUnchanged(state)) {
      const block = getBlockAt(workingState.drillTargetCol, workingState.drillTargetRow);
      if (block) {
        const hpAfter = block.hp - 1;
        drillCompletion = {
          col: workingState.drillTargetCol,
          row: workingState.drillTargetRow,
          hpAfter,
        };
      }
    }
    workingState = idleState();
  }

  const newDrillDirection = resolveDrillInputPriority(input);

  if (!state.isGrounded || newDrillDirection === DRILL_DIRECTIONS.IDLE) {
    return { drillState: workingState, drillCompletion };
  }

  const target = getDrillTargetCell(state, newDrillDirection);
  const block = getBlockAt(target.col, target.row);
  if (!block) {
    return { drillState: workingState, drillCompletion };
  }

  return {
    drillState: {
      drillDirection: newDrillDirection,
      drillTargetCol: target.col,
      drillTargetRow: target.row,
      drillCooldownRemainingTicks: DRILL_COOLDOWN_TICKS,
    },
    drillCompletion,
  };
};

/** Grid cell targeted when drilling in `direction` */
const getDrillTargetCell = (playerState: PlayerState, drillDirection: DRILL_DIRECTION) => {
  let col = Math.floor(playerState.x / BLOCK_SIZE.width);
  let row = Math.floor(playerState.y / BLOCK_SIZE.height);

  if (drillDirection === DRILL_DIRECTIONS.DOWN && playerState.isGrounded) row++;
  else if (drillDirection === DRILL_DIRECTIONS.LEFT && playerState.isTouchingBlockLeft) col--;
  else if (drillDirection === DRILL_DIRECTIONS.RIGHT && playerState.isTouchingBlockRight) col++;

  return { col, row };
};

const isTargetUnchanged = ({
  drillDirection,
  drillTargetCol,
  drillTargetRow,
  ...playerState
}: DrillState & PlayerState): boolean => {
  if (drillTargetCol < 0 || drillTargetRow < 0) return true;

  const { col, row } = getDrillTargetCell(playerState, drillDirection);
  return col === drillTargetCol && row === drillTargetRow;
};

const resolveDrillInputPriority = (input: DrillInput): DRILL_DIRECTION => {
  if (input.down) return DRILL_DIRECTIONS.DOWN;
  // if both left and right are held, falls back to idle
  if (!(input.left && input.right)) {
    if (input.left) return DRILL_DIRECTIONS.LEFT;
    if (input.right) return DRILL_DIRECTIONS.RIGHT;
  }
  return DRILL_DIRECTIONS.IDLE;
};

const isStillHoldingDrill = (
  input: DrillInput,
  drillDirection: DRILL_DIRECTION,
  isGrounded: boolean
): boolean => {
  if (!isGrounded) return false;
  if (input.down) return drillDirection === DRILL_DIRECTIONS.DOWN;
  return (
    (drillDirection === DRILL_DIRECTIONS.LEFT && input.left) ||
    (drillDirection === DRILL_DIRECTIONS.RIGHT && input.right)
  );
};
