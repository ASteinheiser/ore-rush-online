import { Room, type AuthContext, type Client } from '@colyseus/core';
import {
  calculateMovement,
  FIXED_TIME_STEP,
  PLAYER_SIZE,
  ATTACK_SIZE,
  ATTACK_OFFSET_X,
  ATTACK_OFFSET_Y,
  ATTACK_COOLDOWN,
  ATTACK_DAMAGE__DELAY,
  ATTACK_DAMAGE__FRAME_TIME,
  BLOCK_SIZE,
  WS_EVENT,
  WS_CODE,
  InputSchema,
  type AuthPayload,
  type InputPayload,
} from '@repo/core-game';
import type { PrismaClient } from '../../repo/prisma-client/client';
import { validateJwt } from '../../auth/jwt';
import { logger } from '../../logger';
import { ROOM_ERROR } from '../error';
import { GameRoomState } from './schemas';
import { Auth, type AuthResult } from './systems/Auth';
import { BlockMap } from './systems/BlockMap';
import { PlayerVision } from './systems/PlayerVision';
import { PlayerMovement } from './systems/PlayerMovement';

const MAX_PLAYERS_PER_ROOM = 10;
/** This is the speed at which we stream updates to the client.
 * Updates should be interpolated clientside to appear smoother */
const SERVER_PATCH_RATE = 1000 / 20; // 20fps = 50ms

interface GameRoomArgs {
  prisma: PrismaClient;
  connectionCheckInterval: number;
}

export class GameRoom extends Room {
  patchRate = SERVER_PATCH_RATE;
  maxClients = MAX_PLAYERS_PER_ROOM;

  prisma: PrismaClient;
  auth = new Auth(this);

  elapsedTime = 0;
  state = new GameRoomState();
  blockMap = new BlockMap(this);
  playerVision = new PlayerVision(this);
  playerMovement = new PlayerMovement(this);

  onAuth(_: Client, __: unknown, context: AuthContext) {
    return this.auth.onAuth(context);
  }

  onJoin(client: Client, _: unknown, authResult: AuthResult) {
    const { player, isExistingPlayer } = this.auth.onJoin(client, authResult);

    this.playerMovement.spawnPlayer(client.sessionId, player, isExistingPlayer);
    this.playerVision.setupVisionForClient(client, player);
    this.blockMap.clientVisibleBlocks.set(client.sessionId, new Set());
  }

  onLeave(client: Client, code: number) {
    return this.auth.onLeave(client, code);
  }

  cleanupPlayer(sessionId: string) {
    logger.info({
      message: `Cleaning up player...`,
      data: { roomId: this.roomId, clientId: sessionId },
    });

    this.auth.expectingReconnections.delete(sessionId);
    this.auth.forcedDisconnects.delete(sessionId);
    this.state.players.delete(sessionId);
    this.blockMap.clientVisibleBlocks.delete(sessionId);
    this.playerVision.clientVisiblePlayers.delete(sessionId);
  }

  onDispose() {
    logger.info({
      message: `Room disposing...`,
      data: { roomId: this.roomId },
    });

    this.auth.stopConnectionCheck();
  }

  onUncaughtException(error: Error, methodName: string) {
    // log any uncaught errors for debugging purposes
    logger.error({
      message: `Uncaught exception`,
      data: { roomId: this.roomId, methodName, error: error.message },
    });

    // possibly handle saving game state
    // possibly handle disconnecting all clients if needed
  }

  onCreate({ prisma, connectionCheckInterval }: GameRoomArgs) {
    logger.info({
      message: `New room created!`,
      data: { roomId: this.roomId },
    });

    this.prisma = prisma;

    // Ping/Pong for client RTT measurement
    this.onMessage(WS_EVENT.PING, (client) => {
      client.send(WS_EVENT.PONG);
    });

    this.onMessage(WS_EVENT.LEAVE_ROOM, (client) => {
      // we explicitly do not want to allow reconnection here
      this.auth.kickClient(WS_CODE.SUCCESS, 'Intentional leave', client, false);
    });

    this.auth.startConnectionCheck(connectionCheckInterval);

    this.onMessage(WS_EVENT.PLAYER_INPUT, (client, payload: InputPayload) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        // do not allow reconnection, client will need to re-join to get a player
        return this.auth.kickClient(WS_CODE.NOT_FOUND, ROOM_ERROR.CONNECTION_NOT_FOUND, client, false);
      }

      if (!InputSchema.safeParse(payload).success) {
        return this.auth.kickClient(WS_CODE.BAD_REQUEST, ROOM_ERROR.INVALID_PAYLOAD, client);
      }

      player.lastActivityTime = Date.now();
      player.inputQueue.push(payload);
    });

    // errors in refreshToken event should not allow reconnection
    // clients will need to re-authenticate when re-joining
    this.onMessage(WS_EVENT.REFRESH_TOKEN, (client, payload: AuthPayload) => {
      const authUser = validateJwt(payload.token);
      if (!authUser) {
        return this.auth.kickClient(WS_CODE.UNAUTHORIZED, ROOM_ERROR.INVALID_TOKEN, client, false);
      }

      const player = this.state.players.get(client.sessionId);
      if (!player) {
        return this.auth.kickClient(WS_CODE.NOT_FOUND, ROOM_ERROR.CONNECTION_NOT_FOUND, client, false);
      }

      const hasUserIdChanged = player.userId !== authUser.id;
      if (hasUserIdChanged) {
        return this.auth.kickClient(WS_CODE.FORBIDDEN, ROOM_ERROR.USER_ID_CHANGED, client, false);
      }

      player.lastActivityTime = Date.now();
      player.tokenExpiresAt = authUser.expiresAt;

      logger.info({
        message: `Token refreshed`,
        data: { roomId: this.roomId, clientId: client.sessionId, userName: player.username },
      });
    });

    this.setSimulationInterval((deltaTime) => {
      this.elapsedTime += deltaTime;

      while (this.elapsedTime >= FIXED_TIME_STEP) {
        this.elapsedTime -= FIXED_TIME_STEP;
        this.fixedTick();
      }
    });
  }

  fixedTick() {
    this.state.players.forEach((player, sessionId) => {
      const client = this.clients.getById(sessionId);
      // only process players that are still connected (and properly set up)
      if (!client?.view) return;

      this.playerVision.updateClientVisiblePlayers(client, player);
      this.blockMap.updateClientVisibleBlocks(client, player);

      try {
        let input: undefined | InputPayload;
        // dequeue player inputs
        while ((input = player.inputQueue.shift())) {
          // acknowledge the input to the client (updates will be batched, so we can call this first)
          player.lastProcessedInputSeq = input.seq;

          if (input.left) player.isFacingRight = false;
          else if (input.right) player.isFacingRight = true;

          const { x: newX, y: newY } = calculateMovement({ ...player, ...PLAYER_SIZE, ...input });
          player.x = newX;
          player.y = newY;

          // Check if enough time has passed since last attack
          const currentTime = Date.now();
          const timeSinceLastAttack = currentTime - player.lastAttackTime;
          const canAttack = timeSinceLastAttack >= ATTACK_COOLDOWN;

          // find the damage frames in the attack animation
          if (
            timeSinceLastAttack >= ATTACK_DAMAGE__DELAY &&
            timeSinceLastAttack < ATTACK_DAMAGE__FRAME_TIME + ATTACK_DAMAGE__DELAY
          ) {
            // calculate the damage frame
            player.attackDamageFrameX = player.isFacingRight
              ? player.x + ATTACK_OFFSET_X
              : player.x - ATTACK_OFFSET_X;
            player.attackDamageFrameY = player.y - ATTACK_OFFSET_Y;

            // check if the attack hit a block
            for (const block of this.state.blocks) {
              if (
                block.type !== 'empty' &&
                !player.blocksHit.includes(block.id) &&
                block.x - BLOCK_SIZE.width / 2 < player.attackDamageFrameX + ATTACK_SIZE.width / 2 &&
                block.x + BLOCK_SIZE.width / 2 > player.attackDamageFrameX - ATTACK_SIZE.width / 2 &&
                block.y - BLOCK_SIZE.height / 2 < player.attackDamageFrameY + ATTACK_SIZE.height / 2 &&
                block.y + BLOCK_SIZE.height / 2 > player.attackDamageFrameY - ATTACK_SIZE.height / 2
              ) {
                player.blocksHit.push(block.id);

                block.hp--;
                if (block.hp <= 0) {
                  if (block.type === 'iron' || block.type === 'gold') {
                    player.inventory[block.type]++;
                  }
                  block.hp = 0;
                  block.maxHp = 0;
                  block.type = 'empty';
                }
              }
            }
          } else {
            player.attackDamageFrameX = undefined;
            player.attackDamageFrameY = undefined;
            player.blocksHit = [];
          }

          // if the player is mid-attack, don't process any more inputs
          if (!canAttack) {
            return;
          } else if (input.attack) {
            player.isAttacking = true;
            player.attackCount++;
            player.lastAttackTime = currentTime;
          } else {
            player.isAttacking = false;
          }
        }
      } catch (error) {
        const client = this.clients.getById(sessionId);
        if (client) {
          const message = (error as Error)?.message || ROOM_ERROR.INTERNAL_SERVER_ERROR;
          // allow reconnection as player inputs will be cleared, potentially solving issues
          this.auth.kickClient(WS_CODE.INTERNAL_SERVER_ERROR, message, client);
        }
      }
    });
  }
}
