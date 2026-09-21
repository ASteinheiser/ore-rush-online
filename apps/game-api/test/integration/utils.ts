import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { Client } from '@colyseus/sdk';
import type { ColyseusTestServer } from '@colyseus/testing';
import type { GraphQLResponse } from '@apollo/server';
import { SHIPS, WS_ROOM, type GameRoomState } from '@repo/core-game';
import type { PrismaClient } from '../../src/repo/prisma-client/client';
import type { DecodedToken, User } from '../../src/auth/jwt';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is not set');

/** default is 10 seconds (10000ms) */
export const DEFAULT_EXPIRES_IN_MS = 10 * 1000;
interface TestUser {
  id: string;
  userName: string;
  email: string;
}
const TEST_USER_COUNT = 200;
export const TEST_USERS: Array<TestUser> = Array(TEST_USER_COUNT)
  .fill(null)
  .map((_, i) => ({
    id: `test-user-id-${i + 1}`,
    userName: `test-user-name-${i + 1}`,
    email: `test-user-${i + 1}@email.com`,
  }));

export const getTestShipId = (user: TestUser) => {
  const index = TEST_USERS.findIndex((u) => u.id === user.id);
  return `test-ship-${index}`;
};

export const makeTestContextUser = (user: TestUser): User => {
  return {
    id: user.id,
    email: user.email,
    expiresAt: Date.now() + DEFAULT_EXPIRES_IN_MS,
  };
};

interface GenerateTestJWTArgs {
  user?: TestUser;
  /** Defaults to 10 seconds (10000ms) */
  expiresInMs?: number;
}
/** Generate a JWT for a test user, defaults to use TEST_USERS[0] */
export const generateTestJWT = ({
  user = TEST_USERS[0],
  expiresInMs = DEFAULT_EXPIRES_IN_MS,
}: GenerateTestJWTArgs): string => {
  const payload: DecodedToken = {
    sub: user.id,
    email: user.email,
    exp: Math.floor((Date.now() + expiresInMs) / 1000),
  };

  return jwt.sign(payload, JWT_SECRET);
};

interface JoinTestRoomArgs {
  server: ColyseusTestServer;
  token: string;
  user?: TestUser;
  shipId?: string;
}
/** join or create a room on a test server */
export const joinTestRoom = async ({
  server,
  token,
  user = TEST_USERS[0],
  shipId = getTestShipId(user),
}: JoinTestRoomArgs) => {
  const client = new Client(server.sdk.settings);
  client.auth.token = token;
  return client.joinOrCreate<GameRoomState>(WS_ROOM.GAME_ROOM, { shipId });
};

interface ReconnectTestRoomArgs {
  server: ColyseusTestServer;
  reconnectionToken: string;
}
/** reconnect to a room on a test server */
export const reconnectTestRoom = async ({ server, reconnectionToken }: ReconnectTestRoomArgs) => {
  const client = await server.sdk.reconnect(reconnectionToken);

  return client;
};

export const parseGQLData = <Type>(result: GraphQLResponse<Type>) => {
  return result.body.kind === 'single'
    ? (result.body.singleResult?.data as Type)
    : (result.body.initialResult.data as Type);
};

/** seeds data into the local test DB */
export const setupTestDb = async (prisma: PrismaClient) => {
  await Promise.all(
    TEST_USERS.map(({ id, userName }) =>
      prisma.profile.create({
        data: {
          userId: id,
          userName,
        },
      })
    )
  );
};

/** seeds an owned ship for each test user */
export const setupTestShips = async (prisma: PrismaClient) => {
  await Promise.all(
    TEST_USERS.map((user) =>
      prisma.ship.create({
        data: {
          id: getTestShipId(user),
          shipId: SHIPS[0].id,
          profileId: user.id,
        },
      })
    )
  );
};

/** deletes test data from each table */
export const cleanupTestDb = async (prisma: PrismaClient) => {
  await prisma.ship.deleteMany();
  await prisma.item.deleteMany();
  await prisma.profile.deleteMany();
};

/** Postgres `Int` columns are 4-byte signed integers, so incrementing past this causes a
 * "value out of range for type integer" DB error we can use to force a mid-transaction failure. */
export const POSTGRES_INT_MAX = 2147483647;
