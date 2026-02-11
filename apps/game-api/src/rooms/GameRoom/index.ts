import { Room, ServerError, type AuthContext, type Client } from '@colyseus/core';
import { StateView, type Ref } from '@colyseus/schema';
import { CloseCode } from 'colyseus';
import { Quadtree, Rectangle } from '@timohausmann/quadtree-ts';
import { nanoid } from 'nanoid';
import {
  calculateMovement,
  FIXED_TIME_STEP,
  PLAYER_SIZE,
  MAP_SIZE,
  ATTACK_SIZE,
  ATTACK_OFFSET_X,
  ATTACK_OFFSET_Y,
  ATTACK_COOLDOWN,
  ATTACK_DAMAGE__DELAY,
  ATTACK_DAMAGE__FRAME_TIME,
  // ENEMY_SPAWN_RATE,
  // MAX_ENEMIES,
  ENEMY_SIZE,
  WS_EVENT,
  WS_CODE,
  INACTIVITY_TIMEOUT,
  RECONNECTION_TIMEOUT,
  InputSchema,
  type AuthPayload,
  type InputPayload,
} from '@repo/core-game';
import type { PrismaClient, Profile } from '../../repo/prisma-client/client';
import { validateJwt } from '../../auth/jwt';
import { logger } from '../../logger';
import { ROOM_ERROR } from '../error';
import { Ore } from './roomState';
import { GameRoomState, Player } from './roomState';

const MAX_PLAYERS_PER_ROOM = 10;
/** This is the speed at which we stream updates to the client.
 * Updates should be interpolated clientside to appear smoother */
const SERVER_PATCH_RATE = 1000 / 20; // 20fps = 50ms

/** Basic in-memory storage of results for all players in a room */
export const RESULTS: ResultStorage = {};
interface ResultStorage {
  [roomId: string]: {
    [userId: string]: {
      username: string;
      attackCount: number;
      killCount: number;
    };
  };
}

interface AuthResult {
  user: Profile;
  tokenExpiresAt: number;
}

interface GameRoomArgs {
  prisma: PrismaClient;
  connectionCheckInterval: number;
}

export class GameRoom extends Room {
  maxClients = MAX_PLAYERS_PER_ROOM;
  patchRate = SERVER_PATCH_RATE;

  state = new GameRoomState();
  elapsedTime = 0;
  lastEnemySpawnTime = 0;

  prisma: PrismaClient;

  connectionCheckTimeout: NodeJS.Timeout;
  reconnectionTimeout = RECONNECTION_TIMEOUT;
  expectingReconnections = new Set<string>();
  forcedDisconnects = new Set<string>();

  oreQuadtree: Quadtree<Rectangle>;
  oreRectangles = new Map<string, Rectangle>();
  clientVisibleOres = new Map<string, Set<string>>();
  VIEW_RADIUS = 300;

  onCreate({ prisma, connectionCheckInterval }: GameRoomArgs) {
    logger.info({
      message: `New room created!`,
      data: { roomId: this.roomId },
    });

    this.oreQuadtree = new Quadtree({
      width: MAP_SIZE.width,
      height: MAP_SIZE.height,
      maxObjects: 4,
      maxLevels: 6,
    });
    this.generateOreMap();

    this.prisma = prisma;

    this.connectionCheckTimeout = setInterval(() => this.checkPlayerConnection(), connectionCheckInterval);

    // Ping/Pong for client RTT measurement
    this.onMessage(WS_EVENT.PING, (client) => {
      client.send(WS_EVENT.PONG);
    });

    this.onMessage(WS_EVENT.PLAYER_INPUT, (client, payload: InputPayload) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) {
        // do not allow reconnection, client will need to re-join to get a player
        return this.kickClient(WS_CODE.NOT_FOUND, ROOM_ERROR.CONNECTION_NOT_FOUND, client, false);
      }

      if (!InputSchema.safeParse(payload).success) {
        return this.kickClient(WS_CODE.BAD_REQUEST, ROOM_ERROR.INVALID_PAYLOAD, client);
      }

      player.lastActivityTime = Date.now();
      player.inputQueue.push(payload);
    });

    // errors in refreshToken event should not allow reconnection
    // clients will need to re-authenticate when re-joining
    this.onMessage(WS_EVENT.REFRESH_TOKEN, (client, payload: AuthPayload) => {
      const authUser = validateJwt(payload.token);
      if (!authUser) {
        return this.kickClient(WS_CODE.UNAUTHORIZED, ROOM_ERROR.INVALID_TOKEN, client, false);
      }

      const player = this.state.players.get(client.sessionId);
      if (!player) {
        return this.kickClient(WS_CODE.NOT_FOUND, ROOM_ERROR.CONNECTION_NOT_FOUND, client, false);
      }

      const hasUserIdChanged = player.userId !== authUser.id;
      if (hasUserIdChanged) {
        return this.kickClient(WS_CODE.FORBIDDEN, ROOM_ERROR.USER_ID_CHANGED, client, false);
      }

      player.lastActivityTime = Date.now();
      player.tokenExpiresAt = authUser.expiresAt;

      logger.info({
        message: `Token refreshed`,
        data: { roomId: this.roomId, clientId: client.sessionId, userName: player.username },
      });
    });

    this.onMessage(WS_EVENT.LEAVE_ROOM, (client) => {
      // we explicitly do not want to allow reconnection here
      this.kickClient(WS_CODE.SUCCESS, 'Intentional leave', client, false);
    });

    this.setSimulationInterval((deltaTime) => {
      this.elapsedTime += deltaTime;

      while (this.elapsedTime >= FIXED_TIME_STEP) {
        this.elapsedTime -= FIXED_TIME_STEP;
        this.fixedTick();
      }
    });
  }

  generateOreMap() {
    const cols = Math.ceil(MAP_SIZE.width / ENEMY_SIZE.width);
    const rows = Math.ceil(MAP_SIZE.height / ENEMY_SIZE.height);
    const totalBlocks = cols * rows;

    for (let i = 0; i < totalBlocks; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const ore = new Ore();
      ore.id = nanoid();
      ore.x = col * ENEMY_SIZE.width + ENEMY_SIZE.width / 2;
      ore.y = row * ENEMY_SIZE.height + ENEMY_SIZE.height / 2;
      ore.type = Math.random() < 0.5 ? 'iron' : 'gold';
      ore.hp = ore.type === 'iron' ? 2 : 4;

      this.state.ores.push(ore);

      const rect = new Rectangle({
        x: ore.x - ENEMY_SIZE.width / 2,
        y: ore.y - ENEMY_SIZE.height / 2,
        width: ENEMY_SIZE.width,
        height: ENEMY_SIZE.height,
        data: ore as unknown as void,
      });
      this.oreQuadtree.insert(rect);
      this.oreRectangles.set(ore.id, rect);
    }
  }

  fixedTick() {
    this.state.players.forEach((player, sessionId) => {
      const client = this.clients.find((c) => c.sessionId === sessionId);
      if (client?.view) {
        const currentlyVisibleOres = this.clientVisibleOres.get(sessionId);
        const nowVisible = new Set<string>();

        const searchArea = new Rectangle({
          x: player.x - this.VIEW_RADIUS,
          y: player.y - this.VIEW_RADIUS,
          width: this.VIEW_RADIUS * 2,
          height: this.VIEW_RADIUS * 2,
        });

        const nearbyOres = this.oreQuadtree.retrieve(searchArea);

        for (const nearbyOre of nearbyOres) {
          const ore = nearbyOre.data;
          nowVisible.add((ore as unknown as Ore).id);

          if (!currentlyVisibleOres.has((ore as unknown as Ore).id)) {
            client.view.add(ore as unknown as Ref);
          }
        }

        for (const oreId of currentlyVisibleOres) {
          if (!nowVisible.has(oreId)) {
            const ore = this.state.ores.find((ore) => ore.id === oreId);
            client.view.remove(ore);
          }
        }

        this.clientVisibleOres.set(sessionId, nowVisible);
      }

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

            const oresToDestroy: Array<string> = [];
            // check if the attack hit an ore
            for (const ore of this.state.ores) {
              if (
                ore.type !== 'destroyed' &&
                !player.oresHit.includes(ore.id) &&
                ore.x - ENEMY_SIZE.width / 2 < player.attackDamageFrameX + ATTACK_SIZE.width / 2 &&
                ore.x + ENEMY_SIZE.width / 2 > player.attackDamageFrameX - ATTACK_SIZE.width / 2 &&
                ore.y - ENEMY_SIZE.height / 2 < player.attackDamageFrameY + ATTACK_SIZE.height / 2 &&
                ore.y + ENEMY_SIZE.height / 2 > player.attackDamageFrameY - ATTACK_SIZE.height / 2
              ) {
                player.oresHit.push(ore.id);

                ore.hp--;
                if (ore.hp <= 0) {
                  oresToDestroy.push(ore.id);
                  player.inventory[ore.type]++;
                }
              }
            }

            oresToDestroy.forEach((oreId) => this.destroyOre(oreId));
          } else {
            player.attackDamageFrameX = undefined;
            player.attackDamageFrameY = undefined;
            player.oresHit = [];
          }

          // if the player is mid-attack, don't process any more inputs
          if (!canAttack) {
            return;
          } else if (input.attack) {
            player.isAttacking = true;
            player.attackCount++;
            player.lastAttackTime = currentTime;
            // RESULTS[this.roomId][player.userId].attackCount++;
          } else {
            player.isAttacking = false;
          }
        }
      } catch (error) {
        const client = this.clients.find((c) => c.sessionId === sessionId);
        if (client) {
          const message = (error as Error)?.message || ROOM_ERROR.INTERNAL_SERVER_ERROR;
          // allow reconnection as player inputs will be cleared, potentially solving issues
          this.kickClient(WS_CODE.INTERNAL_SERVER_ERROR, message, client);
        }
      }
    });
  }

  destroyOre(oreId: string) {
    const ore = this.state.ores.find((ore) => ore.id === oreId);
    ore.type = 'destroyed';
  }

  checkPlayerConnection() {
    const clientsToRemove: Array<{ client: Client; reason: string }> = [];

    this.state.players.forEach((player, sessionId) => {
      const client = this.clients.find((c) => c.sessionId === sessionId);
      if (!client) {
        // Skip removal if we're still waiting for this client to reconnect
        if (this.expectingReconnections.has(sessionId)) return;

        this.cleanupPlayer(sessionId);
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
        data: { roomId: this.roomId, clientId: client.sessionId, reason },
      });

      if (reason === ROOM_ERROR.TOKEN_EXPIRED) {
        // do not allow reconnection, client will need to re-authenticate
        this.kickClient(WS_CODE.UNAUTHORIZED, reason, client, false);
      } else {
        this.kickClient(WS_CODE.TIMEOUT, reason, client);
      }
    });
  }

  /** errors in onAuth will not allow reconnection */
  async onAuth(_: Client, __: unknown, context: AuthContext): Promise<AuthResult> {
    const authUser = validateJwt(context.token);
    if (!authUser) throw new ServerError(WS_CODE.UNAUTHORIZED, ROOM_ERROR.INVALID_TOKEN);

    const dbUser = await this.prisma.profile.findUnique({ where: { userId: authUser.id } });
    if (!dbUser) throw new ServerError(WS_CODE.NOT_FOUND, ROOM_ERROR.PROFILE_NOT_FOUND);

    return { user: dbUser, tokenExpiresAt: authUser.expiresAt };
  }

  onJoin(client: Client, _: unknown, { user, tokenExpiresAt }: AuthResult) {
    let existingSessionId: string | undefined;
    let existingPlayer: Player | undefined;

    this.state.players.forEach((player, sessionId) => {
      if (player.userId === user.userId) {
        existingSessionId = sessionId;
        existingPlayer = player;
      }
    });

    if (existingSessionId) {
      logger.info({
        message: `Replacing existing connection`,
        data: {
          roomId: this.roomId,
          existingClientId: existingSessionId,
          newClientId: client.sessionId,
          userName: user.userName,
        },
      });

      const existingClient = this.clients.find((c) => c.sessionId === existingSessionId);
      if (existingClient) {
        // do not allow reconnection, this client/player should be forcefully removed
        this.kickClient(WS_CODE.FORBIDDEN, ROOM_ERROR.NEW_CONNECTION_FOUND, existingClient, false);
      } else {
        this.cleanupPlayer(existingSessionId);
      }
    }

    logger.info({
      message: `New player joined!`,
      data: { roomId: this.roomId, clientId: client.sessionId, userName: user.userName },
    });

    let player: Player;
    if (existingPlayer) {
      player = existingPlayer;
      player.tokenExpiresAt = tokenExpiresAt;
      player.lastActivityTime = Date.now();
      // players should have inputs cleared on reconnection
      player.inputQueue = [];
    } else {
      player = new Player();
      player.tokenExpiresAt = tokenExpiresAt;
      player.lastActivityTime = Date.now();
      player.userId = user.userId;
      player.username = user.userName;
      player.x = Math.random() * MAP_SIZE.width;
      player.y = Math.random() * MAP_SIZE.height;
    }

    client.view = new StateView();
    this.clientVisibleOres.set(client.sessionId, new Set());
    this.state.players.set(client.sessionId, player);

    if (!RESULTS[this.roomId]) RESULTS[this.roomId] = {};
    RESULTS[this.roomId][player.userId] = {
      username: user.userName,
      attackCount: player.attackCount,
      killCount: player.killCount,
    };
  }

  /** Disconnect a client (allowing reconnection by default) */
  kickClient(code: number, message: string, client: Client, allowReconnection = true) {
    logger.info({
      message: `Disconnecting client...`,
      data: { roomId: this.roomId, clientId: client.sessionId, allowReconnection, code, message },
    });

    if (!allowReconnection) {
      this.forcedDisconnects.add(client.sessionId);
    }
    client.leave(code, message);
  }

  async onLeave(client: Client, code: number) {
    const { sessionId } = client;
    const consented = code === CloseCode.CONSENTED;

    logger.info({
      message: `Client left...`,
      data: { roomId: this.roomId, clientId: sessionId, consented },
    });

    if (consented || this.forcedDisconnects.has(sessionId)) {
      return this.cleanupPlayer(sessionId);
    }

    try {
      logger.info({
        message: `Attempting to reconnect client`,
        data: { roomId: this.roomId, clientId: sessionId },
      });

      this.expectingReconnections.add(sessionId);
      await this.allowReconnection(client, this.reconnectionTimeout);
      this.expectingReconnections.delete(sessionId);

      const player = this.state.players.get(sessionId);
      if (!player) {
        // do not allow reconnection, client will need to re-join
        return this.kickClient(WS_CODE.FORBIDDEN, ROOM_ERROR.CONNECTION_NOT_FOUND, client, false);
      }
      // players should have inputs cleared on reconnection
      player.inputQueue = [];
      player.lastActivityTime = Date.now();

      logger.info({
        message: `Client reconnected`,
        data: { roomId: this.roomId, clientId: sessionId },
      });
    } catch {
      logger.info({
        message: `Client failed to reconnect in time`,
        data: { roomId: this.roomId, clientId: sessionId },
      });

      this.cleanupPlayer(sessionId);
    }
  }

  cleanupPlayer(sessionId: string) {
    logger.info({
      message: `Cleaning up player...`,
      data: { roomId: this.roomId, clientId: sessionId },
    });

    this.expectingReconnections.delete(sessionId);
    this.forcedDisconnects.delete(sessionId);
    this.state.players.delete(sessionId);
  }

  onDispose() {
    logger.info({
      message: `Room disposing...`,
      data: { roomId: this.roomId },
    });

    if (this.connectionCheckTimeout) clearInterval(this.connectionCheckTimeout);

    // delete results after 10 seconds -- stop gap for in-memory management
    setTimeout(() => delete RESULTS[this.roomId], 10 * 1000);
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
}
