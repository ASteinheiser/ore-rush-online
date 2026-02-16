import { ServerError, type AuthContext } from '@colyseus/core';
import { WS_CODE } from '@repo/core-game';
import type { Profile } from '../../../repo/prisma-client/client';
import { validateJwt } from '../../../auth/jwt';
import { ROOM_ERROR } from '../../error';
import type { GameRoom } from '../index';

export interface AuthResult {
  user: Profile;
  tokenExpiresAt: number;
}

export class Auth {
  constructor(private room: GameRoom) {}

  /** errors in onAuth will not allow reconnection */
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
}
