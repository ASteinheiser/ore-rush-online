import { ServerError, type AuthContext, type Client } from '@colyseus/core';
import { WS_CODE, INACTIVITY_TIMEOUT, RECONNECTION_TIMEOUT } from '@repo/core-game';
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
  reconnectionTimeout = RECONNECTION_TIMEOUT;
  connectionCheckTimeout: NodeJS.Timeout;

  expectingReconnections = new Set<string>();
  forcedDisconnects = new Set<string>();

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
        this.kickClient(WS_CODE.FORBIDDEN, ROOM_ERROR.NEW_CONNECTION_FOUND, existingClient, false);
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

  /** Disconnect a client (allowing reconnection by default) */
  public kickClient(code: number, message: string, client: Client, allowReconnection = true) {
    logger.info({
      message: `Disconnecting client...`,
      data: { roomId: this.room.roomId, clientId: client.sessionId, allowReconnection, code, message },
    });

    if (!allowReconnection) {
      this.forcedDisconnects.add(client.sessionId);
    }
    client.leave(code, message);
  }

  public startConnectionCheck(connectionCheckInterval: number) {
    this.connectionCheckTimeout = setInterval(() => this.checkPlayerConnection(), connectionCheckInterval);
  }

  public stopConnectionCheck() {
    if (this.connectionCheckTimeout) clearInterval(this.connectionCheckTimeout);
  }

  private checkPlayerConnection() {
    const clientsToRemove: Array<{ client: Client; reason: string }> = [];

    this.room.state.players.forEach((player, sessionId) => {
      const client = this.room.clients.getById(sessionId);
      if (!client) {
        // Skip removal if we're still waiting for this client to reconnect
        if (this.expectingReconnections.has(sessionId)) return;

        this.room.cleanupPlayer(sessionId);
        return;
      }

      const tokenExpiresIn = player.tokenExpiresAt - Date.now();
      if (tokenExpiresIn <= 0) {
        clientsToRemove.push({ client, reason: ROOM_ERROR.TOKEN_EXPIRED });
        return;
      }

      const timeSinceLastActivity = Date.now() - player.lastActivityTime;
      if (timeSinceLastActivity > INACTIVITY_TIMEOUT) {
        clientsToRemove.push({ client, reason: ROOM_ERROR.PLAYER_INACTIVITY });
        return;
      }
    });

    clientsToRemove.forEach(({ client, reason }) => {
      logger.info({
        message: `Removing client...`,
        data: { roomId: this.room.roomId, clientId: client.sessionId, reason },
      });

      if (reason === ROOM_ERROR.TOKEN_EXPIRED) {
        // do not allow reconnection, client will need to re-authenticate
        this.kickClient(WS_CODE.UNAUTHORIZED, reason, client, false);
      } else {
        this.kickClient(WS_CODE.TIMEOUT, reason, client);
      }
    });
  }
}
