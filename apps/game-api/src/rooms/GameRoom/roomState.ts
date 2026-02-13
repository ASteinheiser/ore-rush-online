import { ArraySchema, MapSchema, Schema, type, view } from '@colyseus/schema';
import type { InputPayload, BLOCK_TYPE } from '@repo/core-game';

export class Inventory extends Schema {
  @type('number') iron: number = 0;
  @type('number') gold: number = 0;
}

export class Block extends Schema {
  @type('string') id: string;
  @type('number') x: number;
  @type('number') y: number;
  @type('number') hp: number;
  @type('number') maxHp: number;
  @type('string') type: BLOCK_TYPE;
}

export class Player extends Schema {
  userId: string;
  tokenExpiresAt: number;
  @type('string') username: string;
  @type('number') x: number;
  @type('number') y: number;
  @type('boolean') isFacingRight: boolean = true;
  @type('boolean') isAttacking: boolean = false;
  attackCount: number = 0;
  lastAttackTime: number = 0;
  blocksHit: Array<string> = [];
  @type('number') killCount: number = 0;
  @type(Inventory) inventory: Inventory = new Inventory();
  inputQueue: Array<InputPayload> = [];
  /** Latest input sequence processed by the server for this player */
  @type('number') lastProcessedInputSeq: number = 0;
  /** This is used for networking checks */
  lastActivityTime: number = Date.now();
  /** This is stored and synced for debugging purposes */
  @type('number') attackDamageFrameX: number;
  /** This is stored and synced for debugging purposes */
  @type('number') attackDamageFrameY: number;
}

export class GameRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @view() @type({ array: Block }) blocks = new ArraySchema<Block>();
}
