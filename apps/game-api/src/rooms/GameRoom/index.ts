import { Room, type AuthContext, type Client } from '@colyseus/core';
import { GameRoomState, FIXED_TIME_STEP, WS_EVENT, WS_CODE } from '@repo/core-game';
import type { PrismaClient } from '../../repo/prisma-client/client';
import { logger } from '../../logger';
import { ROOM_ERROR } from '../error';
import { Auth, type AuthResult } from './systems/Auth';
import { BlockMap } from './systems/BlockMap';
import { PlayerInput } from './systems/PlayerInput';
import { PlayerVision } from './systems/PlayerVision';
import { PlayerMovement } from './systems/PlayerMovement';
import { PlayerMining } from './systems/PlayerMining';
import { PlayerExtraction } from './systems/PlayerExtraction';
import { InputRateLimiter } from './systems/InputRateLimiter';

const MAX_PLAYERS_PER_ROOM = 10;
/** This is the speed at which we stream updates to the client.
 * Updates should be interpolated clientside to appear smoother */
const SERVER_PATCH_RATE = 1000 / 20; // 20fps = 50ms

interface GameRoomArgs {
  prisma: PrismaClient;
  connectionCheckInterval: number;
}

export class GameRoom extends Room {
  readonly patchRate = SERVER_PATCH_RATE;
  readonly maxClients = MAX_PLAYERS_PER_ROOM;

  public prisma?: PrismaClient;
  public auth = new Auth(this);

  private elapsedTime = 0;
  public state = new GameRoomState();
  public blockMap = new BlockMap(this);
  public inputRateLimiter = new InputRateLimiter();
  private playerInput = new PlayerInput(this);
  private playerVision = new PlayerVision(this);
  private playerMovement = new PlayerMovement(this);
  private playerMining = new PlayerMining(this);
  private playerExtraction = new PlayerExtraction(this);

  onCreate({ prisma, connectionCheckInterval }: GameRoomArgs) {
    logger.info({
      message: `New room created!`,
      data: { roomId: this.roomId },
    });

    this.prisma = prisma;

    this.auth.setupRefreshTokenHandler();
    this.auth.startConnectionCheck(connectionCheckInterval);

    // Ping/Pong for client RTT measurement
    this.onMessage(WS_EVENT.PING, (client) => {
      client.send(WS_EVENT.PONG);
    });

    this.onMessage(WS_EVENT.PLAYER_EXTRACT, (client) => {
      this.playerExtraction.handleExtractRequest(client);
    });

    this.playerInput.setupPlayerInputHandler();

    this.setSimulationInterval((deltaTime) => {
      this.elapsedTime += deltaTime;

      while (this.elapsedTime >= FIXED_TIME_STEP) {
        this.elapsedTime -= FIXED_TIME_STEP;
        this.fixedTick();
      }

      // Vision updates should run once per simulation callback (patch rate, ~20Hz) rather than per fixed tick (~64Hz)
      // Clients only receive state at patch rate, so visibility changes from intermediate fixed ticks are never sent
      this.updateVisibility();
    }, this.patchRate);
  }

  onAuth(_: Client, __: unknown, context: AuthContext) {
    return this.auth.onAuth(context);
  }

  onJoin(client: Client, _: unknown, authResult: AuthResult) {
    const { player, isExistingPlayer } = this.auth.onJoin(client, authResult);

    this.playerMovement.spawnPlayer(client.sessionId, player, isExistingPlayer);
    this.playerVision.setupVisionForClient(client, player);
  }

  onLeave(client: Client, code: number) {
    return this.auth.onLeave(client, code);
  }

  cleanupPlayer(sessionId: string) {
    logger.info({
      message: `Cleaning up player...`,
      data: { roomId: this.roomId, clientId: sessionId },
    });

    this.state.players.delete(sessionId);
    this.auth.cleanupPlayer(sessionId);
    this.blockMap.cleanupPlayer(sessionId);
    this.playerVision.cleanupPlayer(sessionId);
    this.inputRateLimiter.cleanupPlayer(sessionId);
  }

  onDispose() {
    logger.info({
      message: `Room disposing...`,
      data: { roomId: this.roomId },
    });

    // handle room closing logic, such as saving state, etc.
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

  fixedTick() {
    this.state.players.forEach((player, sessionId) => {
      try {
        this.playerInput.processPlayerInput(player, (input) => {
          this.playerMovement.handleInput(player, input);
          this.playerMining.handleInput(player, input);
        });
      } catch (error) {
        const client = this.clients.getById(sessionId);
        const message = (error as Error)?.message || ROOM_ERROR.INTERNAL_SERVER_ERROR;

        if (client) {
          // allow reconnection in case reconnection solves the error
          this.auth.kickClient(WS_CODE.INTERNAL_SERVER_ERROR, message, client);
        } else {
          logger.error({
            message: `Error processing player input without a client`,
            data: { roomId: this.roomId, clientId: sessionId, error: message },
          });
        }
      }
    });
  }

  /** Updates per-client visibility (players + blocks) */
  updateVisibility() {
    this.state.players.forEach((player, sessionId) => {
      const client = this.clients.getById(sessionId);
      if (!client?.view) return;

      try {
        this.playerVision.updateVisiblePlayers(client, player);
        this.blockMap.updateVisibleBlocks(client, player);
      } catch (error) {
        const message = (error as Error)?.message || ROOM_ERROR.INTERNAL_SERVER_ERROR;
        // allow reconnection in case reconnection solves the error
        this.auth.kickClient(WS_CODE.INTERNAL_SERVER_ERROR, message, client);
      }
    });
  }
}
