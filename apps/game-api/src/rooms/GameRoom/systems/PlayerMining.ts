import {
  type Player,
  type InputPayload,
  PLAYER_FUEL_CONSUMPTION_RATE_DRILL,
  advanceDrill,
  ORE,
  isOreType,
  calculateInventoryWeight,
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
        // if the block is destroyed
        if (block.hp <= 0) {
          // if the block is an ore, add it to the player's inventory
          if (isOreType(block.type)) {
            const usedCapacity = calculateInventoryWeight(player.inventory);
            if (usedCapacity + ORE[block.type].weight <= player.inventory.capacity) {
              player.inventory[block.type]++;
            }
          }
          // delete the block from the block map
          this.room.blockMap.deleteBlock(block.id);
        }
      }
    }
  }
}
