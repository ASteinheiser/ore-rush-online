import { Schema, type } from '@colyseus/schema';
import { type BLOCK_TYPE } from '../constants/block';

export class Block extends Schema {
  @type('string') id!: string;
  @type('number') x!: number;
  @type('number') y!: number;
  @type('number') hp!: number;
  @type('number') maxHp!: number;
  @type('string') type!: BLOCK_TYPE;
}
