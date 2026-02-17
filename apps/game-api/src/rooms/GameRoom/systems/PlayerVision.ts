import type { Client } from 'colyseus';
import { StateView } from '@colyseus/schema';
import { PLAYER_VIEW_RADIUS } from '@repo/core-game';
import { PLAYER_VIEW_LEVELS, type Player } from '../schemas/Player';
import type { GameRoom } from '../index';

export class PlayerVision {
  clientVisiblePlayers = new Map<string, Set<string>>();

  constructor(private room: GameRoom) {}

  public setupVisionForClient(client: Client, player: Player) {
    // initialize StateView
    client.view = new StateView();
    // allow player to see self and private fields
    client.view.add(player, PLAYER_VIEW_LEVELS.VIEW);
    client.view.add(player, PLAYER_VIEW_LEVELS.PRIVATE);
    client.view.add(player, PLAYER_VIEW_LEVELS.DEBUG);

    // allow other players to see player's public fields (name only)
    this.room.state.players.forEach((player, sessionId) => {
      if (sessionId === client.sessionId) return; // skip self

      const otherClient = this.room.clients.getById(sessionId);
      if (otherClient) {
        otherClient.view.add(player);
      }
    });
  }

  public updateClientVisiblePlayers(client: Client, player: Player) {
    const visibleToClient = this.clientVisiblePlayers.get(client.sessionId) ?? new Set();
    const nowVisible = new Set<string>();

    for (const [otherSessionId, otherPlayer] of this.room.state.players) {
      if (otherSessionId === client.sessionId) continue; // skip self

      const dx = Math.abs(otherPlayer.x - player.x);
      const dy = Math.abs(otherPlayer.y - player.y);

      if (dx <= PLAYER_VIEW_RADIUS && dy <= PLAYER_VIEW_RADIUS) {
        nowVisible.add(otherSessionId);
        if (!visibleToClient.has(otherSessionId)) {
          client.view.add(otherPlayer, PLAYER_VIEW_LEVELS.VIEW);
          client.view.add(otherPlayer, PLAYER_VIEW_LEVELS.DEBUG);
        }
      } else {
        if (visibleToClient.has(otherSessionId)) {
          client.view.remove(otherPlayer, PLAYER_VIEW_LEVELS.VIEW);
          client.view.remove(otherPlayer, PLAYER_VIEW_LEVELS.DEBUG);
        }
      }
    }

    this.clientVisiblePlayers.set(client.sessionId, nowVisible);
  }
}
