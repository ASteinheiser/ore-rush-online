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
    } // TODO: cleanup this logic - DRY
    else if (input.down && this.checkForBlockToDrill(player, DRILL_DIRECTIONS.DOWN)) {
      player.lastDrillTime = currentTime;
      player.drillDirection = DRILL_DIRECTIONS.DOWN;
    } else if (input.left && this.checkForBlockToDrill(player, DRILL_DIRECTIONS.LEFT)) {
      player.lastDrillTime = currentTime;
      player.drillDirection = DRILL_DIRECTIONS.LEFT;
    } else if (input.right && this.checkForBlockToDrill(player, DRILL_DIRECTIONS.RIGHT)) {
      player.lastDrillTime = currentTime;
      player.drillDirection = DRILL_DIRECTIONS.RIGHT;
    } else {
      player.drillDirection = DRILL_DIRECTIONS.IDLE;
    }
  }

  /** Check if the player is able to drill a block. Also, updates the state for blocks and player inventory */
  private checkForBlockToDrill(player: Player, direction: DRILL_DIRECTION) {
    // only allow drilling if the player is grounded
    if (!player.isGrounded) return false;

    // start from the player's position (in grid coordinates - cols/rows)
    let targetCol = Math.floor(player.x / BLOCK_SIZE.width);
    let targetRow = Math.floor(player.y / BLOCK_SIZE.height);

    if (direction === DRILL_DIRECTIONS.LEFT && player.isTouchingBlockLeft) {
      targetCol--;
    } else if (direction === DRILL_DIRECTIONS.RIGHT && player.isTouchingBlockRight) {
      targetCol++;
    } // TODO: ensure proper overlap, otherwise players can drill on blocks they barely stand on
    else if (direction === DRILL_DIRECTIONS.DOWN && player.isGrounded) {
      targetRow++;
    }

    const block = this.room.blockMap.getBlock(targetCol, targetRow);
    if (!block) return false;

    block.hp--;
    if (block.hp <= 0) {
      if (block.type === 'iron' || block.type === 'gold') {
        player.inventory[block.type]++;
      }
      this.room.blockMap.deleteBlock(block.id);
    }

    return true;
  }
}
