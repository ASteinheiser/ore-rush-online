import { Schema, type, view } from '@colyseus/schema';
import { type InputPayload, type DRILL_DIRECTION, DRILL_DIRECTIONS } from '../constants/player';

/** adding a player to the view without a view level will only show the username */
export const PLAYER_VIEW_LEVELS = {
  VIEW: 1,
  PRIVATE: 2,
} as const;

export class Inventory extends Schema {
  @type('number') iron: number = 0;
  @type('number') gold: number = 0;
}

export class Player extends Schema {
  /** Identity fields */
  userId!: string;
  tokenExpiresAt!: number;
  @type('string') username!: string;
  /** Position and animation fields */
  @view(PLAYER_VIEW_LEVELS.VIEW) @type('float64') x!: number;
  @view(PLAYER_VIEW_LEVELS.VIEW) @type('float64') y!: number;
  @view(PLAYER_VIEW_LEVELS.VIEW) @type('string') drillDirection: DRILL_DIRECTION = DRILL_DIRECTIONS.IDLE;
  @view(PLAYER_VIEW_LEVELS.VIEW) @type('boolean') isGrounded: boolean = false;
  isTouchingBlockLeft: boolean = false;
  isTouchingBlockRight: boolean = false;
  /** Player vertical velocity (only synced to the active player for reconciliation) */
  @view(PLAYER_VIEW_LEVELS.PRIVATE) @type('float64') velocityY: number = 0;
  /** Private player information for active player */
  @view(PLAYER_VIEW_LEVELS.PRIVATE) @type(Inventory) inventory: Inventory = new Inventory();
  /** Latest input sequence processed by the server (used for client reconciliation) */
  @view(PLAYER_VIEW_LEVELS.PRIVATE) @type('number') lastProcessedInputSeq: number = 0;
  /** Input fields */
  inputQueue: Array<InputPayload> = [];
  lastActivityTime: number = Date.now();
  lastDrillTime: number = 0;
  drillTargetCol: number = -1;
  drillTargetRow: number = -1;
}
