import type { Client } from 'colyseus';
import type { Player } from '@repo/core-game';
import type { GameRoom } from '../index';

export class PlayerExtraction {
  constructor(private room: GameRoom) {}

  /** Whether the player is currently standing in the extraction zone */
  public isInExtractionZone(player: Player): boolean {
    return false;
  }

  /**
   * Called when a player requests to extract (ex: a new WS_EVENT.EXTRACT message).
   * Should validate the player is actually in the extraction zone first.
   * If successful, then persist the player's inventory.
   */
  public handleExtractRequest(client: Client, player: Player) {
    // TODO
  }

  /**
   * Called when a player dies (ex: fuel depleted outside of the extraction zone).
   * Should discard the player's inventory and remove them from the map.
   */
  public handleDeath(sessionId: string, player: Player) {
    // TODO
  }
}
