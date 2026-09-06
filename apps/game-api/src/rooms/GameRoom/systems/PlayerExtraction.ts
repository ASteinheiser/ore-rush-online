import type { Client } from 'colyseus';
import { type Player, EMPTY_MAP_ROWS, BLOCK_SIZE, WS_CODE, ORE, isOreType } from '@repo/core-game';
import type { GameRoom } from '../index';
import { StashRepository } from '../../../repo/Stash';

export class PlayerExtraction {
  constructor(private room: GameRoom) {}

  /** Whether the player is currently standing in the extraction zone */
  private isInExtractionZone(player: Player): boolean {
    const extractionZoneHeight = EMPTY_MAP_ROWS * BLOCK_SIZE.height;
    return player.y < extractionZoneHeight;
  }

  /**
   * Called when a player requests to extract (ex: a new WS_EVENT.EXTRACT message).
   * Should validate the player is actually in the extraction zone first.
   * If successful, then persist the player's inventory and remove them from the map.
   */
  public async handleExtractRequest(client: Client) {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    if (this.isInExtractionZone(player)) {
      if (!this.room.prisma) return;
      const stashRepository = new StashRepository(this.room.prisma);

      const inventoryToStore = Object.keys(player.inventory)
        .filter((itemId) => isOreType(itemId))
        .map((itemId) => ({
          profileId: player.userId,
          id: ORE[itemId].id,
          quantity: player.inventory[itemId],
        }));

      await stashRepository.storeItemInStash(inventoryToStore[0]);

      this.room.auth.kickClient(WS_CODE.SUCCESS, 'Player has extracted', client, false);
    }
  }

  /**
   * Executes when a player dies (ex: fuel depleted outside of the extraction zone).
   * Should discard the player's inventory (do not persist) and remove them from the map.
   */
  public handleDeath(player: Player, sessionId: string) {
    const hasPlayerDied = player.fuelRemaining <= 0 && !this.isInExtractionZone(player);

    if (hasPlayerDied) {
      const client = this.room.clients.getById(sessionId);
      if (client) {
        this.room.auth.kickClient(WS_CODE.DEATH, 'Player has died', client, false);
      } else {
        this.room.cleanupPlayer(sessionId);
      }
    }
  }
}
