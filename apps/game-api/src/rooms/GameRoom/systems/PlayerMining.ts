import {
  BLOCK_TYPES,
  PLAYER_FUEL_CONSUMPTION_RATE_DRILL,
  advanceDrill,
  type InputPayload,
  type Player,
} from '@repo/core-game';
import type { GameRoom } from '../index';

export class PlayerMining {
  constructor(private room: GameRoom) {}

  public handleInput(player: Player, input: InputPayload) {
    const result = advanceDrill({
      input,
      state: player,
      getBlockAt: this.room.blockMap.getBlock.bind(this.room.blockMap),
    });

    player.drillDirection = result.drillState.drillDirection;
    player.drillTargetCol = result.drillState.drillTargetCol;
    player.drillTargetRow = result.drillState.drillTargetRow;
    player.drillCooldownRemainingTicks = result.drillState.drillCooldownRemainingTicks;

    if (result.drillCompletion) {
      // consume fuel if the drill completion was successful
      player.fuelRemaining = Math.max(0, player.fuelRemaining - PLAYER_FUEL_CONSUMPTION_RATE_DRILL);

      const { col, row, hpAfter } = result.drillCompletion;
      const block = this.room.blockMap.getBlock(col, row);
      if (block) {
        block.hp = hpAfter;
        if (block.hp <= 0) {
          if (
            block.type === BLOCK_TYPES.COAL ||
            block.type === BLOCK_TYPES.IRON ||
            block.type === BLOCK_TYPES.COPPER
          ) {
            const usedCapacity = player.inventory.coal + player.inventory.iron + player.inventory.copper;
            if (usedCapacity < player.inventory.capacity) {
              player.inventory[block.type]++;
            }
          }
          this.room.blockMap.deleteBlock(block.id);
        }
      }
    }
  }
}
