import { ArraySchema, MapSchema, Schema, type, view } from '@colyseus/schema';
import { Player } from './Player';
import { Block } from './Block';

export class GameRoomState extends Schema {
  @view() @type({ map: Player }) players = new MapSchema<Player>();
  @view() @type({ array: Block }) blocks = new ArraySchema<Block>();
}
