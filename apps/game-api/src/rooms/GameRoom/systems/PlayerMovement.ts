import { MAP_SIZE } from '@repo/core-game';
import { logger } from '../../../logger';
import type { GameRoom } from '../index';
import type { Player } from '../schemas/Player';

export class PlayerMovement {
  constructor(private room: GameRoom) {}

  public spawnPlayer(clientId: string, player: Player, isExistingPlayer: boolean) {
    logger.info({
      message: `${isExistingPlayer ? 'Reconnecting' : 'New'} player joined!`,
      data: { roomId: this.room.roomId, clientId, userName: player.username },
    });

    if (isExistingPlayer) {
      // players should have inputs cleared on reconnection
      player.inputQueue = [];
      // existing players already have a position, so we don't need to spawn them
    } else {
      player.x = Math.random() * MAP_SIZE.width;
      player.y = Math.random() * MAP_SIZE.height;
    }

    this.room.state.players.set(clientId, player);
  }
}
