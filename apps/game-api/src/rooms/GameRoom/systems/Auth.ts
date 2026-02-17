import { ServerError, type AuthContext, type Client } from '@colyseus/core';
import { WS_CODE } from '@repo/core-game';
import { logger } from '../../../logger';
import type { Profile } from '../../../repo/prisma-client/client';
import { validateJwt } from '../../../auth/jwt';
import { ROOM_ERROR } from '../../error';
import { Player } from '../schemas/Player';
import type { GameRoom } from '../index';

export interface AuthResult {
  user: Profile;
  tokenExpiresAt: number;
}

export class Auth {
  constructor(private room: GameRoom) {}

  /**
   * Validates the user's token and fetches their profile from the DB
   *
   * Errors in onAuth will not allow reconnection
   */
  public async onAuth(context: AuthContext): Promise<AuthResult> {
    const authUser = validateJwt(context.token);
    if (!authUser) throw new ServerError(WS_CODE.UNAUTHORIZED, ROOM_ERROR.INVALID_TOKEN);

    const dbUser = await this.room.prisma.profile.findUnique({
      where: { userId: authUser.id },
    });
    if (!dbUser) throw new ServerError(WS_CODE.NOT_FOUND, ROOM_ERROR.PROFILE_NOT_FOUND);

    return {
      user: dbUser,
      tokenExpiresAt: authUser.expiresAt,
    };
  }

  /**
   * Ensures one client per account in the room (cleans up extra connections)
   *
   * Returns the player with updated auth fields, and whether or not it was an existing player
   */
  public onJoin(client: Client, { user, tokenExpiresAt }: AuthResult) {
    let existingSessionId: string | undefined;
    let existingPlayer: Player | undefined;

    this.room.state.players.forEach((player, sessionId) => {
      if (player.userId === user.userId) {
        existingSessionId = sessionId;
        existingPlayer = player;
      }
    });

    if (existingSessionId) {
      logger.info({
        message: `Replacing existing connection`,
        data: {
          roomId: this.room.roomId,
          existingClientId: existingSessionId,
          newClientId: client.sessionId,
          userName: user.userName,
        },
      });

      const existingClient = this.room.clients.getById(existingSessionId);
      if (existingClient) {
        // do not allow reconnection, this client/player should be forcefully removed
        this.room.kickClient(WS_CODE.FORBIDDEN, ROOM_ERROR.NEW_CONNECTION_FOUND, existingClient, false);
      } else {
        // this is a very odd state, just cleanup/respawn the player
        this.room.cleanupPlayer(existingSessionId);
      }
    }

    const player = existingPlayer ?? new Player();

    player.userId = user.userId;
    player.username = user.userName;
    player.tokenExpiresAt = tokenExpiresAt;
    player.lastActivityTime = Date.now();

    return {
      player,
      isExistingPlayer: !!existingPlayer,
    };
  }
}
