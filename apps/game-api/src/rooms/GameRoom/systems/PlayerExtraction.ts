import type { Client } from 'colyseus';
import { type Player, EMPTY_MAP_ROWS, BLOCK_SIZE, WS_CODE } from '@repo/core-game';
import type { GameRoom } from '../index';

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
  public handleExtractRequest(client: Client) {
    const player = this.room.state.players.get(client.sessionId);
    if (!player) return;

    if (this.isInExtractionZone(player)) {
      // TODO: persist the player's inventory
      this.room.auth.kickClient(WS_CODE.SUCCESS, 'Player has extracted', client, false);
    }
  }

  /**
   * Executes when a player dies (ex: fuel depleted outside of the extraction zone).
   * Should discard the player's inventory (do not persist) and remove them from the map.
   */
  public handleDeath(client: Client, player: Player) {
    if (player.fuelRemaining <= 0 && !this.isInExtractionZone(player)) {
      this.room.auth.kickClient(WS_CODE.DEATH, 'Player has died', client, false);
    }
  }
}
