import { Schema, type, view } from '@colyseus/schema';
import {
  type InputPayload,
  type DRILL_DIRECTION,
  DRILL_DIRECTIONS,
  PLAYER_INVENTORY_CAPACITY,
  PLAYER_FUEL_CAPACITY,
} from '../constants/player';

/** adding a player to the view without a view level will only show the username */
export const PLAYER_VIEW_LEVELS = {
  VIEW: 1,
  PRIVATE: 2,
} as const;

export class Inventory extends Schema {
  @type('number') capacity: number = PLAYER_INVENTORY_CAPACITY;
  @type('number') coal: number = 0;
  @type('number') iron: number = 0;
  @type('number') copper: number = 0;
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
  @view(PLAYER_VIEW_LEVELS.PRIVATE) @type('number') fuelCapacity: number = PLAYER_FUEL_CAPACITY;
  @view(PLAYER_VIEW_LEVELS.PRIVATE) @type('number') fuelRemaining: number = PLAYER_FUEL_CAPACITY;
  /** Latest input sequence processed by the server (used for client reconciliation) */
  @view(PLAYER_VIEW_LEVELS.PRIVATE) @type('number') lastProcessedInputSeq: number = 0;
  /** Server-side input fields */
  lastProcessedInput?: InputPayload;
  inputQueue: Array<InputPayload> = [];
  /** Highest `seq` the server has accepted from the client, used to reject duplicate/old/spoofed inputs */
  lastReceivedSeq: number = -1;
  lastActivityTime: number = Date.now();
  /** Fixed simulation ticks remaining before the current drill action completes (`0` = idle) */
  drillCooldownRemainingTicks: number = 0;
  drillTargetCol: number = -1;
  drillTargetRow: number = -1;
}
