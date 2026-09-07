import type { Client } from 'colyseus';
import { type Player, PLAYER_SIZE, WS_CODE, ORE, isOreType, isInExtractionZone } from '@repo/core-game';
import { logger } from '../../../logger';
import type { GameRoom } from '../index';
import { StashRepository } from '../../../repo/Stash';

export class PlayerExtraction {
  constructor(private room: GameRoom) {}

  /**
   * Called when a player requests to extract (ex: a new WS_EVENT.EXTRACT message).
   * Should validate the player is actually in the extraction zone first.
   * If successful, then persist the player's inventory and remove them from the map.
   */
  public async handleExtractRequest(client: Client) {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    if (isInExtractionZone({ ...player, ...PLAYER_SIZE })) {
      if (!this.room.prisma) return;
      const stashRepository = new StashRepository(this.room.prisma);

      try {
        const itemsToStore = Object.keys(player.inventory)
          .filter((itemId) => isOreType(itemId))
          .filter((itemId) => player.inventory[itemId] > 0)
          .map((itemId) => ({
            profileId: player.userId,
            id: ORE[itemId].id,
            quantity: player.inventory[itemId],
          }));

        await stashRepository.storeItemsInStash(itemsToStore);

        this.room.auth.kickClient(WS_CODE.SUCCESS, 'Player has extracted', client, false);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error({
          message: `Error during player extraction - items failed to store in stash`,
          data: { roomId: this.room.roomId, userId: player.userId, error: errorMessage },
        });
      }
    }
  }

  /**
   * Executes when a player dies (ex: fuel depleted outside of the extraction zone).
   * Should discard the player's inventory (do not persist) and remove them from the map.
   */
  public handleDeath(player: Player, sessionId: string) {
    const hasPlayerDied = player.fuelRemaining <= 0 && !isInExtractionZone({ ...player, ...PLAYER_SIZE });

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
