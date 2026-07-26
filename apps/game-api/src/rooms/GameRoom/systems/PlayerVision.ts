import type { Client } from 'colyseus';
import { StateView } from '@colyseus/schema';
import { PLAYER_VIEW_RADIUS, PLAYER_VIEW_LEVELS, type Player } from '@repo/core-game';
import type { GameRoom } from '../index';

export class PlayerVision {
  private lastVisiblePlayers = new Map<string, Set<string>>();
  private stagingVisiblePlayers = new Map<string, Set<string>>();

  constructor(private room: GameRoom) {}

  public cleanupPlayer(sessionId: string) {
    this.lastVisiblePlayers.delete(sessionId);
    this.stagingVisiblePlayers.delete(sessionId);
  }

  public setupVisionForClient(client: Client, player: Player) {
    // initialize StateView
    client.view = new StateView();
    // allow player to see self and private fields
    client.view.add(player);
    client.view.add(player, PLAYER_VIEW_LEVELS.VIEW);
    client.view.add(player, PLAYER_VIEW_LEVELS.PRIVATE);

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
    let currentlyVisiblePlayers = this.lastVisiblePlayers.get(client.sessionId);
    let nowVisible = this.stagingVisiblePlayers.get(client.sessionId);
    // ensure sets are initialized once per client
    if (!currentlyVisiblePlayers) {
      currentlyVisiblePlayers = new Set();
      this.lastVisiblePlayers.set(client.sessionId, currentlyVisiblePlayers);
    }
    if (!nowVisible) {
      nowVisible = new Set();
      this.stagingVisiblePlayers.set(client.sessionId, nowVisible);
    }
    // clear the staging set before calculating new visible players
    nowVisible.clear();

    for (const [otherSessionId, otherPlayer] of this.room.state.players) {
      if (otherSessionId === client.sessionId) continue; // skip self

      const dx = Math.abs(otherPlayer.x - player.x);
      const dy = Math.abs(otherPlayer.y - player.y);

      if (dx <= PLAYER_VIEW_RADIUS && dy <= PLAYER_VIEW_RADIUS) {
        nowVisible.add(otherSessionId);
        if (!currentlyVisiblePlayers.has(otherSessionId)) {
          client.view?.add(otherPlayer, PLAYER_VIEW_LEVELS.VIEW);
        }
      } else {
        if (currentlyVisiblePlayers.has(otherSessionId)) {
          client.view?.remove(otherPlayer, PLAYER_VIEW_LEVELS.VIEW);
          // ensure we still see basic player info (username)
          client.view?.add(otherPlayer);
        }
      }
    }

    this.lastVisiblePlayers.set(client.sessionId, nowVisible);
    this.stagingVisiblePlayers.set(client.sessionId, currentlyVisiblePlayers);
  }
}
