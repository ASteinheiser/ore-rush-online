import {
  MAP_SIZE,
  EMPTY_MAP_ROWS,
  BLOCK_SIZE,
  PLAYER_SIZE,
  calculateMovement,
  type InputPayload,
  type Player,
} from '@repo/core-game';
import { logger } from '../../../logger';
import type { GameRoom } from '../index';

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
      // ensure the player spawns in the empty map rows
      player.y =
        PLAYER_SIZE.height / 2 + Math.random() * (EMPTY_MAP_ROWS * BLOCK_SIZE.height - PLAYER_SIZE.height);
    }

    this.room.state.players.set(clientId, player);
  }

  public handleInput(player: Player, input: InputPayload) {
    const blocks = this.room.blockMap.getNearbyBlocks(player).map(({ x, y }) => ({ x, y }));

    const newPosition = calculateMovement({
      x: player.x,
      y: player.y,
      velocityY: player.velocityY,
      width: PLAYER_SIZE.width,
      height: PLAYER_SIZE.height,
      left: input.left,
      right: input.right,
      up: input.up,
      blocks,
    });

    player.x = newPosition.x;
    player.y = newPosition.y;
    player.velocityY = newPosition.velocityY;
    player.isGrounded = newPosition.isGrounded;
    player.isTouchingBlockLeft = newPosition.isTouchingBlockLeft;
    player.isTouchingBlockRight = newPosition.isTouchingBlockRight;
  }
}
