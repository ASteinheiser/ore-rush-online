import { Schema, type, view } from '@colyseus/schema';
import { type InputPayload, BLOCK_TYPES } from '@repo/core-game';

/** adding a player to the view without a view level will only show the username */
export const PLAYER_VIEW_LEVELS = {
  VIEW: 1,
  PRIVATE: 2,
  DEBUG: 3,
} as const;

export class Inventory extends Schema {
  @type('number') [BLOCK_TYPES.IRON]: number = 0;
  @type('number') [BLOCK_TYPES.GOLD]: number = 0;
}

export class Player extends Schema {
  /** Identity fields */
  userId: string;
  tokenExpiresAt: number;
  @type('string') username: string;
  /** Position and animation fields */
  @view(PLAYER_VIEW_LEVELS.VIEW) @type('number') x: number;
  @view(PLAYER_VIEW_LEVELS.VIEW) @type('number') y: number;
  @view(PLAYER_VIEW_LEVELS.VIEW) @type('boolean') isFacingRight: boolean = true;
  @view(PLAYER_VIEW_LEVELS.VIEW) @type('boolean') isAttacking: boolean = false;
  /** Private player information for active player */
  @view(PLAYER_VIEW_LEVELS.PRIVATE) @type('number') killCount: number = 0;
  @view(PLAYER_VIEW_LEVELS.PRIVATE) @type(Inventory) inventory: Inventory = new Inventory();
  /** Latest input sequence processed by the server (used for client reconciliation) */
  @view(PLAYER_VIEW_LEVELS.PRIVATE) @type('number') lastProcessedInputSeq: number = 0;
  /** Input fields */
  inputQueue: Array<InputPayload> = [];
  lastActivityTime: number = Date.now();
  lastAttackTime: number = 0;
  attackCount: number = 0;
  blocksHit: Array<number> = [];
  /** Debug fields */
  @view(PLAYER_VIEW_LEVELS.DEBUG) @type('number') attackDamageFrameX: number;
  @view(PLAYER_VIEW_LEVELS.DEBUG) @type('number') attackDamageFrameY: number;
}
