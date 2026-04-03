import { Schema, type, view } from '@colyseus/schema';
import { BLOCK_TYPES } from '../constants/block';
import type { InputPayload } from '../constants/player';

/** adding a player to the view without a view level will only show the username */
export const PLAYER_VIEW_LEVELS = {
  VIEW: 1,
  PRIVATE: 2,
} as const;

export class Inventory extends Schema {
  @type('number') [BLOCK_TYPES.IRON]: number = 0;
  @type('number') [BLOCK_TYPES.GOLD]: number = 0;
}

export class Player extends Schema {
  /** Identity fields */
  userId!: string;
  tokenExpiresAt!: number;
  @type('string') username!: string;
  /** Position and animation fields */
  @view(PLAYER_VIEW_LEVELS.VIEW) @type('number') x!: number;
  @view(PLAYER_VIEW_LEVELS.VIEW) @type('number') y!: number;
  @view(PLAYER_VIEW_LEVELS.VIEW) @type('boolean') isDrilling: boolean = false;
  @view(PLAYER_VIEW_LEVELS.VIEW) @type('boolean') isGrounded: boolean = false;
  @view(PLAYER_VIEW_LEVELS.VIEW) @type('boolean') isTouchingBlockLeft: boolean = false;
  @view(PLAYER_VIEW_LEVELS.VIEW) @type('boolean') isTouchingBlockRight: boolean = false;
  /** Player vertical velocity (only synced to the active player for reconciliation) */
  @view(PLAYER_VIEW_LEVELS.PRIVATE) @type('number') velocityY: number = 0;
  /** Private player information for active player */
  @view(PLAYER_VIEW_LEVELS.PRIVATE) @type(Inventory) inventory: Inventory = new Inventory();
  /** Latest input sequence processed by the server (used for client reconciliation) */
  @view(PLAYER_VIEW_LEVELS.PRIVATE) @type('number') lastProcessedInputSeq: number = 0;
  /** Input fields */
  inputQueue: Array<InputPayload> = [];
  lastActivityTime: number = Date.now();
  lastDrillTime: number = 0;
}
