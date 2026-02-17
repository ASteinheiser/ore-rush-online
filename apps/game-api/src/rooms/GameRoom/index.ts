import { Room, type AuthContext, type Client } from '@colyseus/core';
import { FIXED_TIME_STEP, WS_EVENT, WS_CODE } from '@repo/core-game';
import type { PrismaClient } from '../../repo/prisma-client/client';
import { logger } from '../../logger';
import { ROOM_ERROR } from '../error';
import { GameRoomState } from './schemas';
import { Auth, type AuthResult } from './systems/Auth';
import { BlockMap } from './systems/BlockMap';
import { PlayerInput } from './systems/PlayerInput';
import { PlayerVision } from './systems/PlayerVision';
import { PlayerMovement } from './systems/PlayerMovement';
import { PlayerMining } from './systems/PlayerMining';

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
  playerInput = new PlayerInput(this);
  playerVision = new PlayerVision(this);
  playerMovement = new PlayerMovement(this);
  playerMining = new PlayerMining(this);

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

    this.onMessage(WS_EVENT.LEAVE_ROOM, (client) => {
      // we explicitly do not want to allow reconnection here
      this.auth.kickClient(WS_CODE.SUCCESS, 'Intentional leave', client, false);
    });

    this.playerInput.setupPlayerInputHandler();

    this.setSimulationInterval((deltaTime) => {
      this.elapsedTime += deltaTime;

      while (this.elapsedTime >= FIXED_TIME_STEP) {
        this.elapsedTime -= FIXED_TIME_STEP;
        this.fixedTick();
      }
    });
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

  fixedTick() {
    this.state.players.forEach((player, sessionId) => {
      const client = this.clients.getById(sessionId);
      // only process players that are still connected (and properly set up)
      if (!client?.view) return;

      try {
        this.playerInput.processPlayerInput(player, (input) => {
          this.playerMovement.handleInput(player, input);
          this.playerMining.handleInput(player, input);
        });
        // allow positions to be updated before vision updates
        this.playerVision.updateVisiblePlayers(client, player);
        this.blockMap.updateVisibleBlocks(client, player);
      } catch (error) {
        const message = (error as Error)?.message || ROOM_ERROR.INTERNAL_SERVER_ERROR;
        // allow reconnection as player inputs will be cleared, potentially solving issues
        this.auth.kickClient(WS_CODE.INTERNAL_SERVER_ERROR, message, client);
      }
    });
  }
}
