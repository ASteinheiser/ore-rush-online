import type { Client } from 'colyseus';
import { PLAYER_VIEW_RADIUS } from '@repo/core-game';
import { PLAYER_VIEW_LEVELS, type Player } from '../schemas/Player';
import type { GameRoom } from '../index';

export class PlayerVision {
  clientVisiblePlayers = new Map<string, Set<string>>();

  constructor(private room: GameRoom) {}

  updateClientVisiblePlayers(client: Client, player: Player) {
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
        }
      } else {
        if (visibleToClient.has(otherSessionId)) {
          client.view.remove(otherPlayer, PLAYER_VIEW_LEVELS.VIEW);
        }
      }
    }

    this.clientVisiblePlayers.set(client.sessionId, nowVisible);
  }
}
