import type { Client } from 'colyseus';
import { StateView } from '@colyseus/schema';
import { PLAYER_VIEW_RADIUS } from '@repo/core-game';
import { PLAYER_VIEW_LEVELS, type Player } from '../schemas/Player';
import type { GameRoom } from '../index';

export class PlayerVision {
  private clientVisiblePlayers = new Map<string, Set<string>>();

  constructor(private room: GameRoom) {}

  public cleanupPlayer(sessionId: string) {
    this.clientVisiblePlayers.delete(sessionId);
  }

  public setupVisionForClient(client: Client, player: Player) {
    // initialize StateView
    client.view = new StateView();
    // allow player to see self and private fields
    client.view.add(player);
    client.view.add(player, PLAYER_VIEW_LEVELS.VIEW);
    client.view.add(player, PLAYER_VIEW_LEVELS.PRIVATE);
    client.view.add(player, PLAYER_VIEW_LEVELS.DEBUG);

    // allow otherPlayers to see player's public fields (username only)
    this.room.clients.forEach((otherClient) => {
      if (otherClient.sessionId === client.sessionId) return;
      otherClient.view?.add(player);
    });

    // add all otherPlayers to current client's view (username only)
    this.room.state.players.forEach((otherPlayer, sessionId) => {
      if (sessionId === client.sessionId) return;
      client.view?.add(otherPlayer);
    });
  }

  public updateVisiblePlayers(client: Client, player: Player) {
    const visibleToClient = this.clientVisiblePlayers.get(client.sessionId) ?? new Set();
    const nowVisible = new Set<string>();

    for (const [otherSessionId, otherPlayer] of this.room.state.players) {
      if (otherSessionId === client.sessionId) continue; // skip self

      const dx = Math.abs(otherPlayer.x - player.x);
      const dy = Math.abs(otherPlayer.y - player.y);

      if (dx <= PLAYER_VIEW_RADIUS && dy <= PLAYER_VIEW_RADIUS) {
        nowVisible.add(otherSessionId);
        if (!visibleToClient.has(otherSessionId)) {
          client.view?.add(otherPlayer, PLAYER_VIEW_LEVELS.VIEW);
          client.view?.add(otherPlayer, PLAYER_VIEW_LEVELS.DEBUG);
        }
      } else {
        if (visibleToClient.has(otherSessionId)) {
          client.view?.remove(otherPlayer, PLAYER_VIEW_LEVELS.VIEW);
          client.view?.remove(otherPlayer, PLAYER_VIEW_LEVELS.DEBUG);
          // ensure we still see basic player info (username)
          client.view?.add(otherPlayer);
        }
      }
    }

    this.clientVisiblePlayers.set(client.sessionId, nowVisible);
  }
}
