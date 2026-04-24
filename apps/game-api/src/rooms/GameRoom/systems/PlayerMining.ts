import {
  BLOCK_SIZE,
  BLOCK_TYPES,
  PLAYER_FUEL_CONSUMPTION_RATE_DRILL,
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

    if (isInDrillFrame) {
      if (!this.isStillHoldingDrill(player, input) || !this.isTargetUnchanged(player)) {
        this.stopDrill(player);
      }
      return;
    }

    // Cooldown just expired: apply damage, update inventory, etc.
    if (this.isTargetUnchanged(player) && player.drillDirection !== DRILL_DIRECTIONS.IDLE) {
      this.completeDrill(player);
    }

    // Try to start a new drill
    if (input.down) this.startDrill(player, DRILL_DIRECTIONS.DOWN, currentTime);
    else if (input.left) this.startDrill(player, DRILL_DIRECTIONS.LEFT, currentTime);
    else if (input.right) this.startDrill(player, DRILL_DIRECTIONS.RIGHT, currentTime);
    else this.stopDrill(player);
  }

  private isStillHoldingDrill(player: Player, input: InputPayload): boolean {
    if (!player.isGrounded) return false;
    if (input.down) return player.drillDirection === DRILL_DIRECTIONS.DOWN;
    return (
      (player.drillDirection === DRILL_DIRECTIONS.LEFT && input.left) ||
      (player.drillDirection === DRILL_DIRECTIONS.RIGHT && input.right)
    );
  }

  private isTargetUnchanged(player: Player): boolean {
    // skip check if no target (col/row are -1)
    if (player.drillTargetCol < 0 || player.drillTargetRow < 0) {
      return true;
    }
    const { col, row } = this.getTargetCell(player, player.drillDirection);
    return col === player.drillTargetCol && row === player.drillTargetRow;
  }

  private stopDrill(player: Player) {
    player.drillDirection = DRILL_DIRECTIONS.IDLE;
    player.drillTargetCol = -1;
    player.drillTargetRow = -1;
  }

  /** Record drill intent and start cooldown, but don't deal damage yet */
  private startDrill(player: Player, direction: DRILL_DIRECTION, currentTime: number) {
    // only allow drilling if the player is grounded
    if (!player.isGrounded) return;

    const { col, row } = this.getTargetCell(player, direction);
    const block = this.room.blockMap.getBlock(col, row);
    if (!block) return;

    player.lastDrillTime = currentTime;
    player.drillDirection = direction;
    player.drillTargetCol = col;
    player.drillTargetRow = row;
  }

  /** Apply damage after cooldown completes */
  private completeDrill(player: Player) {
    const block = this.room.blockMap.getBlock(player.drillTargetCol, player.drillTargetRow);
    if (block) {
      block.hp--;
      if (block.hp <= 0) {
        if (
          block.type === BLOCK_TYPES.COAL ||
          block.type === BLOCK_TYPES.IRON ||
          block.type === BLOCK_TYPES.COPPER
        ) {
          // If player inventory has capacity, add the block to the inventory. Otherwise, the ore will be "lost"
          const usedCapacity = player.inventory.coal + player.inventory.iron + player.inventory.copper;
          if (usedCapacity < player.inventory.capacity) {
            player.inventory[block.type]++;
          }
        }
        this.room.blockMap.deleteBlock(block.id);
      }
    }

    // consume fuel once one "drill action" has completed
    player.fuelRemaining = Math.max(0, player.fuelRemaining - PLAYER_FUEL_CONSUMPTION_RATE_DRILL);

    this.stopDrill(player);
  }

  private getTargetCell(player: Player, direction: DRILL_DIRECTION) {
    let col = Math.floor(player.x / BLOCK_SIZE.width);
    let row = Math.floor(player.y / BLOCK_SIZE.height);

    if (direction === DRILL_DIRECTIONS.DOWN && player.isGrounded) row++;
    else if (direction === DRILL_DIRECTIONS.LEFT && player.isTouchingBlockLeft) col--;
    else if (direction === DRILL_DIRECTIONS.RIGHT && player.isTouchingBlockRight) col++;

    return { col, row };
  }
}
