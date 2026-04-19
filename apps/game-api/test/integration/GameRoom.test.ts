import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { ServerError } from '@colyseus/core';
import { type ColyseusTestServer, boot } from '@colyseus/testing';
import type { GoTrueAdminApi } from '@supabase/supabase-js';
import {
  WS_CODE,
  WS_EVENT,
  WS_ROOM,
  INACTIVITY_TIMEOUT,
  MAP_SIZE,
  BLOCK_SIZE,
  BLOCK_TYPES,
  PLAYER_SIZE,
  PLAYER_VX_PER_TICK,
  PLAYER_GRAVITY_VY_PER_TICK,
  PLAYER_VIEW_RADIUS,
  PLAYER_VIEW_LEVELS,
  DRILL_COOLDOWN,
  DRILL_DIRECTIONS,
  EMPTY_MAP_ROWS,
  Player,
  type InputPayload,
} from '@repo/core-game';
import type { GameRoom } from '../../src/rooms/GameRoom';
import { makeApp } from '../../src/app.config';
import { ROOM_ERROR } from '../../src/rooms/error';
import { prisma } from '../../src/repo/client';
import {
  TEST_USERS,
  joinTestRoom,
  reconnectTestRoom,
  generateTestJWT,
  setupTestDb,
  cleanupTestDb,
} from './utils';

/** A shorter interval than the default to speed up tests (in ms) */
const TEST_CONNECTION_CHECK_INTERVAL = 100;

describe(`Colyseus WebSocket Server - ${WS_ROOM.GAME_ROOM}`, () => {
  let server: ColyseusTestServer;
  // currently unused, but required by the app config
  const authClient = {} as GoTrueAdminApi;

  beforeAll(async () => {
    await cleanupTestDb(prisma);
    await setupTestDb(prisma);
    const app = makeApp({
      prisma,
      authClient,
      connectionCheckInterval: TEST_CONNECTION_CHECK_INTERVAL,
    });
    server = await boot(app);
  });

  afterAll(async () => {
    await server.shutdown();
    await cleanupTestDb(prisma);
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await server.cleanup();
  });

  const getRoom = (roomId: string) => server.getRoomById(roomId) as GameRoom;

  describe('room onJoin error handling', () => {
    it('should throw an error if a client joins with an invalid token', async () => {
      try {
        await joinTestRoom({ server, token: 'invalid-token' });

        expect.fail('should have thrown an error');
      } catch (error) {
        expect((error as ServerError).code).toBe(WS_CODE.UNAUTHORIZED);
        expect((error as ServerError).message).toBe(ROOM_ERROR.INVALID_TOKEN);
      }
    });

    it('should throw an error if a client joins with an expired token', async () => {
      try {
        await joinTestRoom({ server, token: generateTestJWT({ expiresInMs: 0 }) });

        expect.fail('should have thrown an error');
      } catch (error) {
        expect((error as ServerError).code).toBe(WS_CODE.UNAUTHORIZED);
        expect((error as ServerError).message).toBe(ROOM_ERROR.INVALID_TOKEN);
      }
    });

    it('should throw an error if a client joins without a db user', async () => {
      try {
        const token = generateTestJWT({
          // pass a unique userId that does not exist in the seed data found in setupTestDb inside ./utils.ts
          user: { ...TEST_USERS[0], id: 'non-existent-user-id' },
        });
        await joinTestRoom({ server, token });

        expect.fail('should have thrown an error');
      } catch (error) {
        expect((error as ServerError).code).toBe(WS_CODE.NOT_FOUND);
        expect((error as ServerError).message).toBe(ROOM_ERROR.PROFILE_NOT_FOUND);
      }
    });
  });

  describe('basic room functionality', () => {
    it('should connect a player to a room', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });
    });

    it('should allow a client to gracefully leave the room', async () => {
      /** We need this client otherwise the room will be disposed when the client leaves */
      const keepAliveClient = await joinTestRoom({
        server,
        token: generateTestJWT({ user: TEST_USERS[1] }),
      });
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(keepAliveClient.roomId);

      assertBasicPlayerState({ room, clientIds: [keepAliveClient.sessionId, client.sessionId] });

      await client.leave(true);
      await room.waitForNextSimulationTick();

      assertBasicPlayerState({ room, clientIds: [keepAliveClient.sessionId] });
    });

    it('should emit a PONG event when a client sends a PING event', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });

      const pongPromise = new Promise((resolve) => {
        client.onMessage(WS_EVENT.PONG, () => resolve(true));
      });

      client.send(WS_EVENT.PING);
      const pong = await pongPromise;

      expect(pong).toBe(true);
    });

    it('should return WS_CODE.SUCCESS when a client leaves the room via the LEAVE_ROOM event', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);

      const leaveCodePromise = new Promise((resolve) => {
        client.onLeave((code) => resolve(code));
      });

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });

      client.send(WS_EVENT.LEAVE_ROOM);
      await room.waitForNextSimulationTick();

      assertBasicPlayerState({ room, clientIds: [] });
      expect(await leaveCodePromise).toBe(WS_CODE.SUCCESS);
    });

    it('should allow a client to reconnect to a room', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const reconnectionToken = client.reconnectionToken;

      const room = getRoom(client.roomId);
      room.state.players.get(client.sessionId)!.inventory.iron = 100;
      room.state.players.get(client.sessionId)!.inventory.gold = 50;

      const oldPlayer = getPlayerSnapshot(room, client.sessionId);

      expect(oldPlayer.inventory.iron).toBe(100);
      expect(oldPlayer.inventory.gold).toBe(50);
      assertBasicPlayerState({ room, clientIds: [client.sessionId] });

      await client.leave(false);
      await room.waitForNextSimulationTick();

      // @ts-expect-error - allow use of private property for testing
      expect(room.auth.forcedDisconnects.size).toBe(0);
      // @ts-expect-error - allow use of private property for testing
      expect(room.auth.expectingReconnections.size).toBe(1);
      assertExtraPlayerState({ room, clientIds: [], extraPlayerIds: [client.sessionId] });

      const sameClient = await reconnectTestRoom({ server, reconnectionToken });
      await room.waitForNextSimulationTick();

      expect(sameClient.sessionId).toBe(client.sessionId);
      assertBasicPlayerState({ room, clientIds: [sameClient.sessionId] });
      assertPlayerFieldsState({ room, playerId: sameClient.sessionId, expectedPlayer: oldPlayer });
    });

    it('should kick the client if they fail to reconnect in time', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });

      const room = getRoom(client.roomId);
      // @ts-expect-error - allow use of private property for testing
      room.auth.reconnectionTimeout = 0;

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });

      await client.leave(false);
      await room.waitForNextSimulationTick();

      assertBasicPlayerState({ room, clientIds: [] });
    });

    it('should kick the client if they reconnect but a player is not found', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });

      await client.leave(false);
      await room.waitForNextSimulationTick();

      // @ts-expect-error - allow use of private property for testing
      expect(room.auth.forcedDisconnects.size).toBe(0);
      // @ts-expect-error - allow use of private property for testing
      expect(room.auth.expectingReconnections.size).toBe(1);
      assertExtraPlayerState({ room, clientIds: [], extraPlayerIds: [client.sessionId] });

      room.state.players.delete(client.sessionId);
      await reconnectTestRoom({ server, reconnectionToken: client.reconnectionToken });
      await room.waitForNextSimulationTick();

      assertBasicPlayerState({ room, clientIds: [] });
    });

    it('should take over the player (and kick the old client forcefully) if a new client joins with the same userId', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);

      room.state.players.get(client.sessionId)!.inventory.iron = 100;
      room.state.players.get(client.sessionId)!.inventory.gold = 50;

      const oldPlayer = getPlayerSnapshot(room, client.sessionId);

      expect(oldPlayer.inventory.iron).toBe(100);
      expect(oldPlayer.inventory.gold).toBe(50);
      assertBasicPlayerState({ room, clientIds: [client.sessionId] });

      const newClient = await joinTestRoom({ server, token: generateTestJWT({}) });

      expect(newClient.sessionId).not.toBe(client.sessionId);
      // @ts-expect-error - allow use of private property for testing
      expect(room.auth.forcedDisconnects.has(client.sessionId)).toBe(true);

      await room.waitForNextSimulationTick();

      assertBasicPlayerState({ room, clientIds: [newClient.sessionId] });
      assertPlayerFieldsState({ room, playerId: newClient.sessionId, expectedPlayer: oldPlayer });
    });

    it('should take over the player (and cleanup old client data) if a new client joins with the same userId and the old client is not found', async () => {
      /** We need this client to create a room so we can create a player with no client attached */
      const keepAliveClient = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(keepAliveClient.roomId);

      assertBasicPlayerState({ room, clientIds: [keepAliveClient.sessionId] });

      const badSessionId = 'bad-client-session-id';
      const orphanedPlayer = new Player();
      orphanedPlayer.userId = TEST_USERS[1].id;
      orphanedPlayer.username = TEST_USERS[1].userName;
      orphanedPlayer.inventory.iron = 100;
      orphanedPlayer.inventory.gold = 50;
      room.state.players.set(badSessionId, orphanedPlayer);

      const playerSnapshot = getPlayerSnapshot(room, badSessionId);

      expect(playerSnapshot.inventory.iron).toBe(100);
      expect(playerSnapshot.inventory.gold).toBe(50);
      assertExtraPlayerState({
        room,
        clientIds: [keepAliveClient.sessionId],
        extraPlayerIds: [badSessionId],
      });

      // ensure that this user matches the userId of the orphaned player above
      const client = await joinTestRoom({ server, token: generateTestJWT({ user: TEST_USERS[1] }) });

      // @ts-expect-error - allow use of private property for testing
      expect(room.auth.forcedDisconnects.size).toBe(0);
      // @ts-expect-error - allow use of private property for testing
      expect(room.auth.expectingReconnections.size).toBe(0);
      expect(client.sessionId).not.toBe(badSessionId);

      await room.waitForNextSimulationTick();

      assertBasicPlayerState({ room, clientIds: [keepAliveClient.sessionId, client.sessionId] });
      assertPlayerFieldsState({ room, playerId: client.sessionId, expectedPlayer: playerSnapshot });
    });

    it('should connect multiple clients to the same room when joining at the same time', async () => {
      const [client1, client2, client3, client4] = await Promise.all(
        TEST_USERS.slice(0, 4).map((user) => joinTestRoom({ server, token: generateTestJWT({ user }) }))
      );
      const roomIds = Array.from(new Set([client1.roomId, client2.roomId, client3.roomId, client4.roomId]));

      expect(roomIds.length).toBe(1);

      const room = getRoom(roomIds[0]);
      const clientIds = room.state.players.keys().toArray();

      assertBasicPlayerState({ room, clientIds });
    });
  });

  describe('basic game logic', () => {
    it('should allow a player to move in the room', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);

      room.state.players.get(client.sessionId)!.inventory.iron = 100;
      room.state.players.get(client.sessionId)!.inventory.gold = 50;

      const oldPlayer = getPlayerSnapshot(room, client.sessionId);

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });
      expect(oldPlayer.userId).toBe(TEST_USERS[0].id);
      expect(oldPlayer.username).toBe(TEST_USERS[0].userName);
      expect(typeof oldPlayer.x).toBe('number');
      expect(typeof oldPlayer.y).toBe('number');
      expect(oldPlayer.inventory.iron).toBe(100);
      expect(oldPlayer.inventory.gold).toBe(50);

      client.send(WS_EVENT.PLAYER_INPUT, {
        seq: 0,
        left: false,
        right: true,
        up: false,
        down: false,
      } satisfies InputPayload);
      // ensure the input is processed
      await waitForConnectionCheck();

      const expectedVY = oldPlayer.velocityY + PLAYER_GRAVITY_VY_PER_TICK;
      assertPlayerFieldsState({
        room,
        playerId: client.sessionId,
        expectedPlayer: {
          ...oldPlayer,
          x: oldPlayer.x + PLAYER_VX_PER_TICK,
          y: oldPlayer.y + expectedVY,
        },
      });
    });

    it('should kick a client if they send invalid player input (allowing reconnection)', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });

      const oldPlayer = getPlayerSnapshot(room, client.sessionId);

      client.send(WS_EVENT.PLAYER_INPUT, {
        somePayload: { someKey: NaN },
      });
      await room.waitForNextSimulationTick();

      // @ts-expect-error - allow use of private property for testing
      expect(room.auth.expectingReconnections.size).toBe(1);
      assertExtraPlayerState({ room, clientIds: [], extraPlayerIds: [client.sessionId] });

      const sameClient = await reconnectTestRoom({ server, reconnectionToken: client.reconnectionToken });

      expect(sameClient.sessionId).toBe(client.sessionId);
      assertBasicPlayerState({ room, clientIds: [sameClient.sessionId] });
      assertPlayerFieldsState({ room, playerId: sameClient.sessionId, expectedPlayer: oldPlayer });
    });

    it('should kick a client if there is an unhandled exception in fixedTick (allowing reconnection)', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const reconnectionToken = client.reconnectionToken;
      const room = getRoom(client.roomId);

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });

      room.state.players.get(client.sessionId)!.inputQueue = null as unknown as InputPayload[];
      await room.waitForNextSimulationTick();

      // @ts-expect-error - allow use of private property for testing
      expect(room.auth.forcedDisconnects.size).toBe(0);
      // @ts-expect-error - allow use of private property for testing
      expect(room.auth.expectingReconnections.size).toBe(1);
      assertExtraPlayerState({ room, clientIds: [], extraPlayerIds: [client.sessionId] });

      const sameClient = await reconnectTestRoom({ server, reconnectionToken });
      await room.waitForNextSimulationTick();

      expect(sameClient.sessionId).toBe(client.sessionId);
      assertBasicPlayerState({ room, clientIds: [sameClient.sessionId] });
    });

    it('should kick a client if they send player input but there is no player for the session (no reconnection)', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });

      room.state.players.delete(client.sessionId);
      client.send(WS_EVENT.PLAYER_INPUT, {
        left: true,
        right: false,
        up: false,
        down: false,
        attack: false,
      });
      await room.waitForNextSimulationTick();

      // @ts-expect-error - allow use of private property for testing
      expect(room.auth.expectingReconnections.size).toBe(0);
      assertBasicPlayerState({ room, clientIds: [] });
    });

    it('should keep the correct amount of blocks in vision at different map locations', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });

      const player = room.state.players.get(client.sessionId)!;
      const locations = [
        { x: 0, y: 0, expectedBlocks: 24 }, // top-left corner (top 2 rows are empty spawn area)
        { x: 0, y: MAP_SIZE.height, expectedBlocks: 30 }, // bottom-left corner
        { x: 546, y: 546, expectedBlocks: 121 }, // top-left area
        { x: 2002, y: 2002, expectedBlocks: 121 }, // near center
        { x: 3454, y: 3454, expectedBlocks: 121 }, // bottom-right area
        { x: MAP_SIZE.width, y: MAP_SIZE.height / 2, expectedBlocks: 55 }, // right edge middle
      ] as const;

      for (const { x, y, expectedBlocks } of locations) {
        player.x = x;
        player.y = y;
        await room.waitForNextSimulationTick();

        // @ts-expect-error - allow use of private property for testing
        const visibleBlockCount = room.blockMap.clientVisibleBlocks.get(client.sessionId)?.size ?? 0;
        expect(visibleBlockCount).toBe(expectedBlocks);
      }
    });

    it('should show player position only when in vision (username always visible, x/y when in range)', async () => {
      const observer = await joinTestRoom({ server, token: generateTestJWT({ user: TEST_USERS[0] }) });
      const observed = await joinTestRoom({ server, token: generateTestJWT({ user: TEST_USERS[1] }) });
      const room = getRoom(observer.roomId);

      assertBasicPlayerState({ room, clientIds: [observer.sessionId, observed.sessionId] });

      const observerPlayer = room.state.players.get(observer.sessionId)!;
      const observedPlayer = room.state.players.get(observed.sessionId)!;
      const observerClient = room.clients.getById(observer.sessionId)!;

      // Start out of vision: observer at (0,0), observed far away
      observerPlayer.x = 0;
      observerPlayer.y = 0;
      observedPlayer.x = PLAYER_VIEW_RADIUS + 100;
      observedPlayer.y = PLAYER_VIEW_RADIUS + 100;

      await room.waitForNextSimulationTick();
      expect(observerClient?.view?.has(observedPlayer)).toBe(true);
      expect(observerClient?.view?.hasTag(observedPlayer, PLAYER_VIEW_LEVELS.VIEW)).toBe(false);

      // Move observed into vision
      observedPlayer.x = PLAYER_VIEW_RADIUS - 50;
      observedPlayer.y = PLAYER_VIEW_RADIUS - 50;

      await room.waitForNextSimulationTick();
      expect(observerClient?.view?.has(observedPlayer)).toBe(true);
      expect(observerClient?.view?.hasTag(observedPlayer, PLAYER_VIEW_LEVELS.VIEW)).toBe(true);

      // Move observed back out of vision
      observedPlayer.x = PLAYER_VIEW_RADIUS + 100;
      observedPlayer.y = PLAYER_VIEW_RADIUS + 100;

      await room.waitForNextSimulationTick();
      expect(observerClient?.view?.has(observedPlayer)).toBe(true);
      expect(observerClient?.view?.hasTag(observedPlayer, PLAYER_VIEW_LEVELS.VIEW)).toBe(false);
    });
  });

  describe('movement', () => {
    const noInput: InputPayload = { seq: 0, left: false, right: false, up: false, down: false };

    it('should move a player right when right is pressed', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);
      const player = room.state.players.get(client.sessionId)!;
      const startX = player.x;

      client.send(WS_EVENT.PLAYER_INPUT, { ...noInput, right: true } satisfies InputPayload);
      await waitForConnectionCheck();

      expect(player.x).toBe(startX + PLAYER_VX_PER_TICK);
    });

    it('should move a player left when left is pressed', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);
      const player = room.state.players.get(client.sessionId)!;
      const startX = player.x;

      client.send(WS_EVENT.PLAYER_INPUT, { ...noInput, left: true } satisfies InputPayload);
      await waitForConnectionCheck();

      expect(player.x).toBe(startX - PLAYER_VX_PER_TICK);
    });

    it('should apply gravity when no input is pressed', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);
      const player = room.state.players.get(client.sessionId)!;
      const startY = player.y;
      const startVY = player.velocityY;

      client.send(WS_EVENT.PLAYER_INPUT, noInput);
      await waitForConnectionCheck();

      const expectedVY = startVY + PLAYER_GRAVITY_VY_PER_TICK;
      expect(player.velocityY).toBe(expectedVY);
      expect(player.y).toBe(startY + expectedVY);
    });

    it('should ground a player on top of a block', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);
      const player = room.state.players.get(client.sessionId)!;

      // position the player directly above the first row of blocks
      const blockTopY = EMPTY_MAP_ROWS * BLOCK_SIZE.height + BLOCK_SIZE.height / 2;
      player.x = BLOCK_SIZE.width / 2; // align with col 0
      player.y = blockTopY - BLOCK_SIZE.height / 2 - PLAYER_SIZE.height / 2;
      player.velocityY = 10; // falling downward

      client.send(WS_EVENT.PLAYER_INPUT, noInput);
      await waitForConnectionCheck();

      expect(player.isGrounded).toBe(true);
      expect(player.velocityY).toBe(0);
    });
  });

  describe('drilling', () => {
    const noInput: InputPayload = { seq: 0, left: false, right: false, up: false, down: false };

    /** Positions a player on top of the first block row at the given column, grounded */
    const positionPlayerOnBlock = (room: GameRoom, sessionId: string, col: number) => {
      const player = room.state.players.get(sessionId)!;
      player.x = col * BLOCK_SIZE.width + BLOCK_SIZE.width / 2;
      player.y = EMPTY_MAP_ROWS * BLOCK_SIZE.height - PLAYER_SIZE.height / 2;
      player.velocityY = 0;
      player.isGrounded = true;
      player.drillDirection = DRILL_DIRECTIONS.IDLE;
      player.drillTargetCol = -1;
      player.drillTargetRow = -1;
      player.lastDrillTime = 0;
      return player;
    };

    it('should start drilling down when grounded and down is pressed', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);
      const blockColumn = 5;
      const player = positionPlayerOnBlock(room, client.sessionId, blockColumn);

      // confirm there is a block below
      const blockBelow = room.blockMap.getBlock(blockColumn, EMPTY_MAP_ROWS);
      expect(blockBelow).toBeTruthy();

      client.send(WS_EVENT.PLAYER_INPUT, { ...noInput, down: true } satisfies InputPayload);
      await waitForConnectionCheck();

      expect(player.drillDirection).toBe(DRILL_DIRECTIONS.DOWN);
      expect(player.drillTargetRow).toBe(EMPTY_MAP_ROWS);
      expect(player.drillTargetCol).toBe(blockColumn);
    });

    it('should not drill when the player is airborne', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);
      const player = room.state.players.get(client.sessionId)!;

      // player is in the air (default spawn is in empty rows, not grounded)
      player.isGrounded = false;
      player.velocityY = 0;
      player.lastDrillTime = 0;

      client.send(WS_EVENT.PLAYER_INPUT, { ...noInput, down: true } satisfies InputPayload);
      await waitForConnectionCheck();

      expect(player.drillDirection).toBe(DRILL_DIRECTIONS.IDLE);
    });

    it('should reduce block HP after the drill cooldown expires', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);
      const blockColumn = 6;
      positionPlayerOnBlock(room, client.sessionId, blockColumn);

      const blockBelow = room.blockMap.getBlock(blockColumn, EMPTY_MAP_ROWS)!;
      expect(blockBelow).toBeTruthy();
      const startHp = blockBelow.hp;

      // first input: starts the drill
      client.send(WS_EVENT.PLAYER_INPUT, { ...noInput, seq: 0, down: true } satisfies InputPayload);
      await waitForConnectionCheck();

      expect(blockBelow.hp).toBe(startHp); // no damage yet

      // wait for drill cooldown to expire
      await new Promise((resolve) => setTimeout(resolve, DRILL_COOLDOWN));

      // second input after cooldown: completes the drill and deals damage
      client.send(WS_EVENT.PLAYER_INPUT, { ...noInput, seq: 1, down: true } satisfies InputPayload);
      await waitForConnectionCheck();

      expect(blockBelow.hp).toBe(startHp - 1);
    });

    it('should destroy a dirt block (1 HP) and not add to inventory', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);
      const blockColumn = 7;
      const player = positionPlayerOnBlock(room, client.sessionId, blockColumn);

      // find a block and force it to be dirt with 1 HP
      const block = room.blockMap.getBlock(blockColumn, EMPTY_MAP_ROWS)!;
      expect(block).toBeTruthy();
      block.type = BLOCK_TYPES.DIRT;
      block.hp = 1;
      block.maxHp = 1;
      const blockId = block.id;
      const ironBefore = player.inventory.iron;
      const goldBefore = player.inventory.gold;

      // start drill
      client.send(WS_EVENT.PLAYER_INPUT, { ...noInput, seq: 0, down: true } satisfies InputPayload);
      await waitForConnectionCheck();

      await new Promise((resolve) => setTimeout(resolve, DRILL_COOLDOWN));

      // complete drill
      client.send(WS_EVENT.PLAYER_INPUT, { ...noInput, seq: 1, down: true } satisfies InputPayload);
      await waitForConnectionCheck();

      // block should be destroyed
      expect(room.state.blocks.get(blockId)).toBe(undefined);
      // dirt does not add to inventory
      expect(player.inventory.iron).toBe(ironBefore);
      expect(player.inventory.gold).toBe(goldBefore);
    });

    it('should destroy an iron block and add iron to inventory', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);
      const blockColumn = 8;
      const player = positionPlayerOnBlock(room, client.sessionId, blockColumn);

      const block = room.blockMap.getBlock(blockColumn, EMPTY_MAP_ROWS)!;
      expect(block).toBeTruthy();
      block.type = BLOCK_TYPES.IRON;
      block.hp = 1;
      block.maxHp = 1;
      const ironBefore = player.inventory.iron;
      const goldBefore = player.inventory.gold;

      client.send(WS_EVENT.PLAYER_INPUT, { ...noInput, seq: 0, down: true } satisfies InputPayload);
      await waitForConnectionCheck();

      await new Promise((resolve) => setTimeout(resolve, DRILL_COOLDOWN));

      client.send(WS_EVENT.PLAYER_INPUT, { ...noInput, seq: 1, down: true } satisfies InputPayload);
      await waitForConnectionCheck();

      expect(player.inventory.iron).toBe(ironBefore + 1);
      expect(player.inventory.gold).toBe(goldBefore);
    });

    it('should destroy a gold block and add gold to inventory', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);
      const blockColumn = 9;
      const player = positionPlayerOnBlock(room, client.sessionId, blockColumn);

      const block = room.blockMap.getBlock(blockColumn, EMPTY_MAP_ROWS)!;
      expect(block).toBeTruthy();
      block.type = BLOCK_TYPES.GOLD;
      block.hp = 1;
      block.maxHp = 1;
      const ironBefore = player.inventory.iron;
      const goldBefore = player.inventory.gold;

      client.send(WS_EVENT.PLAYER_INPUT, { ...noInput, seq: 0, down: true } satisfies InputPayload);
      await waitForConnectionCheck();

      await new Promise((resolve) => setTimeout(resolve, DRILL_COOLDOWN));

      client.send(WS_EVENT.PLAYER_INPUT, { ...noInput, seq: 1, down: true } satisfies InputPayload);
      await waitForConnectionCheck();

      expect(player.inventory.iron).toBe(ironBefore);
      expect(player.inventory.gold).toBe(goldBefore + 1);
    });

    it('should stop drilling when the player releases the input', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);
      const blockColumn = 10;
      const player = positionPlayerOnBlock(room, client.sessionId, blockColumn);

      const block = room.blockMap.getBlock(blockColumn, EMPTY_MAP_ROWS)!;
      expect(block).toBeTruthy();
      const startHp = block.hp;

      // start drilling
      client.send(WS_EVENT.PLAYER_INPUT, { ...noInput, seq: 0, down: true } satisfies InputPayload);
      await waitForConnectionCheck();
      expect(player.drillDirection).toBe(DRILL_DIRECTIONS.DOWN);

      // release input before cooldown expires
      client.send(WS_EVENT.PLAYER_INPUT, { ...noInput, seq: 1 } satisfies InputPayload);
      await waitForConnectionCheck();
      expect(player.drillDirection).toBe(DRILL_DIRECTIONS.IDLE);

      // wait for cooldown
      await new Promise((resolve) => setTimeout(resolve, DRILL_COOLDOWN));

      // send another input — should not have dealt damage since we released
      client.send(WS_EVENT.PLAYER_INPUT, { ...noInput, seq: 2 } satisfies InputPayload);
      await waitForConnectionCheck();

      expect(block.hp).toBe(startHp);
    });

    it('should give down drilling priority over left/right', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);
      const blockColumn = 11;
      const player = positionPlayerOnBlock(room, client.sessionId, blockColumn);

      const blockBelow = room.blockMap.getBlock(blockColumn, EMPTY_MAP_ROWS);
      expect(blockBelow).toBeTruthy();

      client.send(WS_EVENT.PLAYER_INPUT, {
        ...noInput,
        down: true,
        left: true,
        right: true,
      } satisfies InputPayload);
      await waitForConnectionCheck();

      expect(player.drillDirection).toBe(DRILL_DIRECTIONS.DOWN);
      expect(player.drillTargetRow).toBe(EMPTY_MAP_ROWS);
      expect(player.drillTargetCol).toBe(blockColumn);
    });
  });

  describe('refreshToken behavior', () => {
    it('should allow a client to refresh their auth token', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });

      room.state.players.get(client.sessionId)!.tokenExpiresAt = Date.now();
      client.send(WS_EVENT.REFRESH_TOKEN, { token: generateTestJWT({}) });
      await waitForConnectionCheck();

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });
    });

    it('should kick a client if they send an invalid refresh token (no reconnection)', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });

      client.send(WS_EVENT.REFRESH_TOKEN, { token: 'invalid-token' });
      await room.waitForNextSimulationTick();

      // @ts-expect-error - allow use of private property for testing
      expect(room.auth.expectingReconnections.size).toBe(0);
      assertBasicPlayerState({ room, clientIds: [] });
    });

    it('should kick a client if their refresh token is expired (no reconnection)', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });

      client.send(WS_EVENT.REFRESH_TOKEN, { token: generateTestJWT({ expiresInMs: 0 }) });
      await room.waitForNextSimulationTick();

      // @ts-expect-error - allow use of private property for testing
      expect(room.auth.expectingReconnections.size).toBe(0);
      assertBasicPlayerState({ room, clientIds: [] });
    });

    it('should kick a client if their refresh token has a different userId (no reconnection)', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });

      client.send(WS_EVENT.REFRESH_TOKEN, { token: generateTestJWT({ user: TEST_USERS[1] }) });
      await room.waitForNextSimulationTick();

      // @ts-expect-error - allow use of private property for testing
      expect(room.auth.expectingReconnections.size).toBe(0);
      assertBasicPlayerState({ room, clientIds: [] });
    });

    it('should kick a client if they send a refresh token and there is no player for the session (no reconnection)', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });

      room.state.players.delete(client.sessionId);
      client.send(WS_EVENT.REFRESH_TOKEN, { token: generateTestJWT({}) });
      await room.waitForNextSimulationTick();

      // @ts-expect-error - allow use of private property for testing
      expect(room.auth.expectingReconnections.size).toBe(0);
      assertBasicPlayerState({ room, clientIds: [] });
    });
  });

  describe('checkPlayerConnection behavior', () => {
    it('should cleanup orphaned players in the case where a client cannot be found', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });

      const badSessionId = 'bad-session-id';
      room.state.players.set(badSessionId, new Player());
      await room.waitForNextSimulationTick();

      assertExtraPlayerState({ room, clientIds: [client.sessionId], extraPlayerIds: [badSessionId] });

      await waitForConnectionCheck();

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });
    });

    it('should wait to cleanup orphaned players if expecting a reconnection', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });

      const badSessionId = 'bad-session-id';
      // @ts-expect-error - allow use of private property for testing
      room.auth.expectingReconnections.add(badSessionId);
      room.state.players.set(badSessionId, new Player());
      await room.waitForNextSimulationTick();

      assertExtraPlayerState({ room, clientIds: [client.sessionId], extraPlayerIds: [badSessionId] });

      await waitForConnectionCheck();

      assertExtraPlayerState({ room, clientIds: [client.sessionId], extraPlayerIds: [badSessionId] });

      // @ts-expect-error - allow use of private property for testing
      room.auth.expectingReconnections.delete(badSessionId);
      await waitForConnectionCheck();

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });
    });

    it('should kick a client if their token expires (no reconnection)', async () => {
      const client = await joinTestRoom({ server, token: generateTestJWT({}) });
      const room = getRoom(client.roomId);

      assertBasicPlayerState({ room, clientIds: [client.sessionId] });

      room.state.players.get(client.sessionId)!.tokenExpiresAt = Date.now();
      await waitForConnectionCheck();

      // @ts-expect-error - allow use of private property for testing
      expect(room.auth.expectingReconnections.size).toBe(0);
      assertBasicPlayerState({ room, clientIds: [] });
    });

    it('should kick clients that are inactive for too long (allowing reconnection)', async () => {
      const client1 = await joinTestRoom({ server, token: generateTestJWT({ user: TEST_USERS[0] }) });
      const client2 = await joinTestRoom({ server, token: generateTestJWT({ user: TEST_USERS[1] }) });
      const room = getRoom(client1.roomId);

      assertBasicPlayerState({
        room,
        clientIds: [client1.sessionId, client2.sessionId],
      });

      room.state.players.get(client1.sessionId)!.lastActivityTime = Date.now() - INACTIVITY_TIMEOUT;
      room.state.players.get(client2.sessionId)!.lastActivityTime = Date.now() - INACTIVITY_TIMEOUT;
      await waitForConnectionCheck();

      // @ts-expect-error - allow use of private property for testing
      expect(room.auth.expectingReconnections.size).toBe(2);
      assertExtraPlayerState({ room, clientIds: [], extraPlayerIds: [client1.sessionId, client2.sessionId] });

      const sameClient1 = await reconnectTestRoom({ server, reconnectionToken: client1.reconnectionToken });
      const sameClient2 = await reconnectTestRoom({ server, reconnectionToken: client2.reconnectionToken });
      await room.waitForNextSimulationTick();

      expect(sameClient1.sessionId).toBe(client1.sessionId);
      expect(sameClient2.sessionId).toBe(client2.sessionId);
      // @ts-expect-error - allow use of private property for testing
      expect(room.auth.expectingReconnections.size).toBe(0);
      assertBasicPlayerState({ room, clientIds: [sameClient1.sessionId, sameClient2.sessionId] });
    });
  });
});

// --- Helpers ---

const waitForConnectionCheck = async () =>
  new Promise((resolve) => setTimeout(resolve, TEST_CONNECTION_CHECK_INTERVAL));

interface AssertBasicPlayerStateArgs {
  room: GameRoom;
  clientIds: string[];
}
/** Asserts that the room has the same number of clients and players */
const assertBasicPlayerState = ({ room, clientIds }: AssertBasicPlayerStateArgs) => {
  expect(room.clients.length).toBe(clientIds.length);
  expect(room.state.players.size).toBe(clientIds.length);

  clientIds.forEach((clientId, index) => {
    expect(room.clients[index].sessionId).toBe(clientId);
    expect(!!room.state.players.get(clientId)).toBe(true);
  });
};

interface AssertExtraPlayerStateArgs {
  room: GameRoom;
  clientIds: string[];
  extraPlayerIds: string[];
}
/** Asserts that the room has additional players with no client attached */
const assertExtraPlayerState = ({ room, clientIds, extraPlayerIds }: AssertExtraPlayerStateArgs) => {
  expect(room.clients.length).toBe(clientIds.length);
  expect(room.state.players.size).toBe(clientIds.length + extraPlayerIds.length);

  clientIds.forEach((clientId, index) => {
    expect(room.clients[index].sessionId).toBe(clientId);
    expect(!!room.state.players.get(clientId)).toBe(true);
  });

  extraPlayerIds.forEach((extraPlayerId) => {
    expect(!!room.state.players.get(extraPlayerId)).toBe(true);
  });
};

interface PlayerSnapshot {
  userId: string;
  username: string;
  x: number;
  y: number;
  velocityY: number;
  inventory: {
    iron: number;
    gold: number;
  };
  lastActivityTime: number;
}
/** Snapshot of player fields for assertion (use live object, not toJSON which omits non-@type fields) */
const getPlayerSnapshot = (room: GameRoom, playerId: string): PlayerSnapshot => {
  const p = room.state.players.get(playerId)!;
  return {
    userId: p.userId,
    username: p.username,
    x: p.x,
    y: p.y,
    velocityY: p.velocityY,
    inventory: {
      iron: p.inventory.iron,
      gold: p.inventory.gold,
    },
    lastActivityTime: p.lastActivityTime,
  };
};

interface AssertPlayerFieldsStateArgs {
  room: GameRoom;
  playerId: string;
  expectedPlayer: PlayerSnapshot;
}
/** Asserts that the player has the correct fields */
const assertPlayerFieldsState = ({ room, playerId, expectedPlayer }: AssertPlayerFieldsStateArgs) => {
  const actualPlayer = room.state.players.get(playerId)!;

  expect(actualPlayer.x).toBe(expectedPlayer.x);
  expect(actualPlayer.y).toBe(expectedPlayer.y);
  expect(actualPlayer.userId).toBe(expectedPlayer.userId);
  expect(actualPlayer.username).toBe(expectedPlayer.username);
  expect(actualPlayer.inventory.iron).toBe(expectedPlayer.inventory.iron);
  expect(actualPlayer.inventory.gold).toBe(expectedPlayer.inventory.gold);
  // ensure that the new player state is not simply a reference to the old player state
  // by checking that the lastActivityTime is updated, since all joins/reconnects should update this
  expect(actualPlayer.lastActivityTime > expectedPlayer.lastActivityTime).toBe(true);
};
