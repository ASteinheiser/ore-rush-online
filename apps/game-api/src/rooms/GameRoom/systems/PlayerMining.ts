import {
  BLOCK_SIZE,
  DRILL_COOLDOWN,
  DRILL_DIRECTIONS,
  type DRILL_DIRECTION,
  type InputPayload,
  type Player,
} from '@repo/core-game';
import type { GameRoom } from '../index';

export class PlayerMining {
  constructor(private room: GameRoom) {}

  public handleInput(player: Player, input: InputPayload) {
    const currentTime = Date.now();
    const timeSinceLastDrill = currentTime - player.lastDrillTime;

    const isInDrillFrame = timeSinceLastDrill < DRILL_COOLDOWN;
    // if the player is mid-drill, don't process any more inputs
    if (isInDrillFrame) {
      return;
    } // handle inputs by checking for blocks and applying damage
    else if (input.down) this.attemptToDrillBlock(player, DRILL_DIRECTIONS.DOWN, currentTime);
    else if (input.left) this.attemptToDrillBlock(player, DRILL_DIRECTIONS.LEFT, currentTime);
    else if (input.right) this.attemptToDrillBlock(player, DRILL_DIRECTIONS.RIGHT, currentTime);
    else player.drillDirection = DRILL_DIRECTIONS.IDLE;
  }

  /** Check if the player is able to drill a block. Updates the state for blocks as well as player drill and inventory */
  private attemptToDrillBlock(player: Player, direction: DRILL_DIRECTION, currentTime: number) {
    // only allow drilling if the player is grounded
    if (!player.isGrounded) return;

    // start from the player's position (in grid coordinates - cols/rows)
    let targetCol = Math.floor(player.x / BLOCK_SIZE.width);
    let targetRow = Math.floor(player.y / BLOCK_SIZE.height);

    if (direction === DRILL_DIRECTIONS.DOWN && player.isGrounded) {
      targetRow++;
    } else if (direction === DRILL_DIRECTIONS.LEFT && player.isTouchingBlockLeft) {
      targetCol--;
    } else if (direction === DRILL_DIRECTIONS.RIGHT && player.isTouchingBlockRight) {
      targetCol++;
    }

    const block = this.room.blockMap.getBlock(targetCol, targetRow);
    if (!block) return;

    player.lastDrillTime = currentTime;
    player.drillDirection = direction;

    block.hp--;
    if (block.hp <= 0) {
      if (block.type === 'iron' || block.type === 'gold') {
        player.inventory[block.type]++;
      }
      this.room.blockMap.deleteBlock(block.id);
    }
  }
}
