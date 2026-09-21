import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { gql } from 'graphql-tag';
import { server } from '../../src/graphql';
import { ProfilesRepository } from '../../src/repo/Profiles';
import { StashRepository } from '../../src/repo/Stash';
import { MarketplaceRepository } from '../../src/repo/Marketplace';
import { ShipsRepository } from '../../src/repo/Ships';
import { ORE, SHIPS } from '@repo/core-game';
import type { GoTrueAdminApi } from '@supabase/supabase-js';
import type { User } from '../../src/auth/jwt';
import { prisma } from '../../src/repo/client';
import {
  TEST_USERS,
  makeTestContextUser,
  parseGQLData,
  setupTestDb,
  cleanupTestDb,
  POSTGRES_INT_MAX,
} from './utils';
import type {
  Test_GetTotalPlayersQuery,
  Test_GetTotalPlayersQueryVariables,
  Test_GetUserProfileQuery,
  Test_GetUserProfileQueryVariables,
  Test_GetUserProfileCoinsQuery,
  Test_GetUserProfileCoinsQueryVariables,
  Test_GetProfileStashQuery,
  Test_GetProfileStashQueryVariables,
  Test_GetProfileShipsQuery,
  Test_GetProfileShipsQueryVariables,
  Test_SellItemMutation,
  Test_SellItemMutationVariables,
  Test_BuyItemMutation,
  Test_BuyItemMutationVariables,
  Test_BuyShipMutation,
  Test_BuyShipMutationVariables,
  Test_SelectShipMutation,
  Test_SelectShipMutationVariables,
} from '../graphql';

describe('GQLServer', () => {
  beforeAll(async () => {
    await cleanupTestDb(prisma);
    await setupTestDb(prisma);
  });

  afterAll(async () => {
    await cleanupTestDb(prisma);
    await prisma.$disconnect();
  });

  const makeDefaultContext = () => ({
    contextValue: {
      dataSources: {
        profilesDb: new ProfilesRepository(prisma),
        stashDb: new StashRepository(prisma),
        marketplaceDb: new MarketplaceRepository(prisma),
        shipsDb: new ShipsRepository(prisma),
      },
      authClient: null as unknown as GoTrueAdminApi,
      user: null as unknown as User,
    },
  });

  it('should fetch total players', async () => {
    const context = makeDefaultContext();

    const result = await server.executeOperation<
      Test_GetTotalPlayersQuery,
      Test_GetTotalPlayersQueryVariables
    >(
      {
        query: gql`
          query Test_GetTotalPlayers {
            totalPlayers
          }
        `,
      },
      context
    );

    const { totalPlayers } = parseGQLData(result);

    expect(totalPlayers).toBe(TEST_USERS.length);
  });

  it('should fetch a user profile by the user id', async () => {
    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(TEST_USERS[0]);

    const result = await server.executeOperation<Test_GetUserProfileQuery, Test_GetUserProfileQueryVariables>(
      {
        query: gql`
          query Test_GetUserProfile {
            profile {
              userName
            }
          }
        `,
      },
      context
    );

    const { profile } = parseGQLData(result);

    expect(profile?.userName).toBe(TEST_USERS[0].userName);
  });

  it('should not fetch a user profile when no user id is provided', async () => {
    const context = makeDefaultContext();

    const result = await server.executeOperation<Test_GetUserProfileQuery, Test_GetUserProfileQueryVariables>(
      {
        query: gql`
          query Test_GetUserProfile {
            profile {
              userName
            }
          }
        `,
      },
      context
    );

    const { profile } = parseGQLData(result);

    expect(profile).toBeNull();
  });

  it("should fetch a user profile's coins", async () => {
    const testUser = TEST_USERS[1];
    const testUserCoins = 104;
    await prisma.profile.update({ where: { userId: testUser.id }, data: { coins: testUserCoins } });

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<
      Test_GetUserProfileCoinsQuery,
      Test_GetUserProfileCoinsQueryVariables
    >(
      {
        query: gql`
          query Test_GetUserProfileCoins {
            profile {
              coins
            }
          }
        `,
      },
      context
    );

    const { profile } = parseGQLData(result);

    expect(profile?.coins).toBe(testUserCoins);
  });

  it("should fetch a user profile's stash", async () => {
    const testUser = TEST_USERS[1];
    const stashItems = [
      { id: 'ore-coal', quantity: 6 },
      { id: 'ore-iron', quantity: 4 },
    ];

    await Promise.all([
      prisma.item.create({ data: { profileId: testUser.id, ...stashItems[0] } }),
      prisma.item.create({ data: { profileId: testUser.id, ...stashItems[1] } }),
    ]);

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<
      Test_GetProfileStashQuery,
      Test_GetProfileStashQueryVariables
    >(
      {
        query: gql`
          query Test_GetProfileStash {
            profile {
              stash {
                id
                quantity
              }
            }
          }
        `,
      },
      context
    );

    const { profile } = parseGQLData(result);

    expect(profile?.stash).toEqual(expect.arrayContaining(stashItems));
  });

  it('should sell an item from the stash for coins', async () => {
    const testUser = TEST_USERS[2];
    const itemId = ORE.coal.id;
    const itemQuantity = 10;
    const sellQuantity = 4;
    const expectedFinalQuantity = itemQuantity - sellQuantity;

    await prisma.item.create({ data: { profileId: testUser.id, id: itemId, quantity: itemQuantity } });

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<Test_SellItemMutation, Test_SellItemMutationVariables>(
      {
        query: gql`
          mutation Test_SellItem($itemId: String!, $quantity: Int!) {
            sellItem(itemId: $itemId, quantity: $quantity) {
              coins
            }
          }
        `,
        variables: { itemId, quantity: sellQuantity },
      },
      context
    );

    const profile = parseGQLData(result).sellItem;
    // placeholder: sell value is tied to quantity
    expect(profile?.coins).toBe(sellQuantity);

    const item = await prisma.item.findUnique({
      where: { profileId_id: { profileId: testUser.id, id: itemId } },
    });
    expect(item?.quantity).toBe(expectedFinalQuantity);
  });

  it('should not sell an item when there is not enough in the stash', async () => {
    const testUser = TEST_USERS[3];

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<Test_SellItemMutation, Test_SellItemMutationVariables>(
      {
        query: gql`
          mutation Test_SellItem($itemId: String!, $quantity: Int!) {
            sellItem(itemId: $itemId, quantity: $quantity) {
              coins
            }
          }
        `,
        variables: { itemId: ORE.coal.id, quantity: 100 },
      },
      context
    );

    expect(result.body.kind === 'single' && result.body.singleResult.errors?.[0]?.message).toBe(
      'Not enough items in stash'
    );
  });

  it('should buy an item, adding it to the stash and deducting coins', async () => {
    const testUser = TEST_USERS[4];
    const itemId = ORE.coal.id;
    const initialCoins = 10;
    const buyQuantity = 5;
    // placeholder: buy value is tied to `weight`
    const expectedFinalCoins = initialCoins - buyQuantity * ORE.coal.weight;

    await prisma.profile.update({ where: { userId: testUser.id }, data: { coins: initialCoins } });

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<Test_BuyItemMutation, Test_BuyItemMutationVariables>(
      {
        query: gql`
          mutation Test_BuyItem($itemId: String!, $quantity: Int!) {
            buyItem(itemId: $itemId, quantity: $quantity) {
              coins
            }
          }
        `,
        variables: { itemId, quantity: buyQuantity },
      },
      context
    );

    const profile = parseGQLData(result).buyItem;

    expect(profile?.coins).toBe(expectedFinalCoins);

    const item = await prisma.item.findUnique({
      where: { profileId_id: { profileId: testUser.id, id: itemId } },
    });
    expect(item?.quantity).toBe(buyQuantity);
  });

  it('should not buy an item when there are not enough coins', async () => {
    const testUser = TEST_USERS[5];

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<Test_BuyItemMutation, Test_BuyItemMutationVariables>(
      {
        query: gql`
          mutation Test_BuyItem($itemId: String!, $quantity: Int!) {
            buyItem(itemId: $itemId, quantity: $quantity) {
              coins
            }
          }
        `,
        variables: { itemId: ORE.coal.id, quantity: 5 },
      },
      context
    );

    expect(result.body.kind === 'single' && result.body.singleResult.errors?.[0]?.message).toBe(
      'Not enough coins to buy this item'
    );
  });

  it('should not buy an item with an invalid item id', async () => {
    const testUser = TEST_USERS[6];

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<Test_BuyItemMutation, Test_BuyItemMutationVariables>(
      {
        query: gql`
          mutation Test_BuyItem($itemId: String!, $quantity: Int!) {
            buyItem(itemId: $itemId, quantity: $quantity) {
              coins
            }
          }
        `,
        variables: { itemId: 'invalid-item-id', quantity: 1 },
      },
      context
    );

    expect(result.body.kind === 'single' && result.body.singleResult.errors?.[0]?.message).toBe(
      'Invalid item ID'
    );
  });

  it('should roll back the coin payout if the sellItem transaction fails', async () => {
    const testUser = TEST_USERS[7];
    const itemId = ORE.coal.id;
    const itemQuantity = 10;
    const sellQuantity = 5;
    // placeholder: sell value is tied to quantity
    const sellValue = sellQuantity;
    // seeded so that crediting `sellQuantity` coins overflows the `coins` column
    const initialCoins = POSTGRES_INT_MAX - sellValue + 1;

    await Promise.all([
      prisma.item.create({ data: { profileId: testUser.id, id: itemId, quantity: itemQuantity } }),
      prisma.profile.update({ where: { userId: testUser.id }, data: { coins: initialCoins } }),
    ]);

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<Test_SellItemMutation, Test_SellItemMutationVariables>(
      {
        query: gql`
          mutation Test_SellItem($itemId: String!, $quantity: Int!) {
            sellItem(itemId: $itemId, quantity: $quantity) {
              coins
            }
          }
        `,
        variables: { itemId, quantity: sellQuantity },
      },
      context
    );

    // the coin credit (2nd op) fails, so the whole transaction should have rolled back
    const errors = result.body.kind === 'single' ? result.body.singleResult.errors : undefined;
    expect(errors?.length).toBeGreaterThan(0);

    // the item removal (1st op) should NOT have been persisted
    const item = await prisma.item.findUnique({
      where: { profileId_id: { profileId: testUser.id, id: itemId } },
    });
    expect(item?.quantity).toBe(itemQuantity);

    const profile = await prisma.profile.findUnique({ where: { userId: testUser.id } });
    expect(profile?.coins).toBe(initialCoins);
  });

  it('should roll back the coin deduction if the buyItem transaction fails', async () => {
    const testUser = TEST_USERS[8];
    const itemId = ORE.coal.id;
    const buyQuantity = 5;
    // placeholder: buy value is tied to `weight`
    const totalCost = buyQuantity * ORE.coal.weight;
    const initialCoins = totalCost;
    // seeded so that adding `buyQuantity` to the stash overflows the item's `quantity` column
    const initialItemQuantity = POSTGRES_INT_MAX - buyQuantity + 1;

    await Promise.all([
      prisma.profile.update({ where: { userId: testUser.id }, data: { coins: initialCoins } }),
      prisma.item.create({ data: { profileId: testUser.id, id: itemId, quantity: initialItemQuantity } }),
    ]);

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<Test_BuyItemMutation, Test_BuyItemMutationVariables>(
      {
        query: gql`
          mutation Test_BuyItem($itemId: String!, $quantity: Int!) {
            buyItem(itemId: $itemId, quantity: $quantity) {
              coins
            }
          }
        `,
        variables: { itemId, quantity: buyQuantity },
      },
      context
    );

    // storing the item (2nd op) fails, so the whole transaction should have rolled back
    const errors = result.body.kind === 'single' ? result.body.singleResult.errors : undefined;
    expect(errors?.length).toBeGreaterThan(0);

    // the coin deduction (1st op) should NOT have been persisted
    const profile = await prisma.profile.findUnique({ where: { userId: testUser.id } });
    expect(profile?.coins).toBe(initialCoins);

    const item = await prisma.item.findUnique({
      where: { profileId_id: { profileId: testUser.id, id: itemId } },
    });
    expect(item?.quantity).toBe(initialItemQuantity);
  });

  it("should fetch a user profile's ships and selectedShipId", async () => {
    const testUser = TEST_USERS[9];
    const ships = [{ shipId: SHIPS[0].id }, { shipId: SHIPS[1].id }];

    const [firstShip] = await Promise.all([
      prisma.ship.create({ data: { profileId: testUser.id, ...ships[0] } }),
      prisma.ship.create({ data: { profileId: testUser.id, ...ships[1] } }),
    ]);
    await prisma.profile.update({
      where: { userId: testUser.id },
      data: { selectedShipId: firstShip.id },
    });

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<
      Test_GetProfileShipsQuery,
      Test_GetProfileShipsQueryVariables
    >(
      {
        query: gql`
          query Test_GetProfileShips {
            profile {
              selectedShipId
              ships {
                id
                shipId
              }
            }
          }
        `,
      },
      context
    );

    const { profile } = parseGQLData(result);

    expect(profile?.ships).toEqual(
      expect.arrayContaining(ships.map((ship) => expect.objectContaining(ship)))
    );
    expect(profile?.selectedShipId).toBe(firstShip.id);
  });

  it("should default a user profile's selectedShipId to null when no ship has been selected", async () => {
    const testUser = TEST_USERS[17];
    await prisma.ship.create({ data: { profileId: testUser.id, shipId: SHIPS[0].id } });

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<
      Test_GetProfileShipsQuery,
      Test_GetProfileShipsQueryVariables
    >(
      {
        query: gql`
          query Test_GetProfileShips {
            profile {
              selectedShipId
              ships {
                id
                shipId
              }
            }
          }
        `,
      },
      context
    );

    const { profile } = parseGQLData(result);

    expect(profile?.selectedShipId).toBeNull();
  });

  it('should give a free ship to a player with no ships', async () => {
    const testUser = TEST_USERS[10];
    const freeShip = SHIPS[0];

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<Test_BuyShipMutation, Test_BuyShipMutationVariables>(
      {
        query: gql`
          mutation Test_BuyShip($shipId: String!) {
            buyShip(shipId: $shipId) {
              id
              shipId
            }
          }
        `,
        variables: { shipId: freeShip.id },
      },
      context
    );

    const ship = parseGQLData(result).buyShip;

    expect(ship?.shipId).toBe(freeShip.id);
    expect(ship?.id).toBeTruthy();

    const ships = await prisma.ship.findMany({ where: { profileId: testUser.id } });
    expect(ships).toHaveLength(1);
    expect(ships[0].shipId).toBe(freeShip.id);
  });

  it('should not give a free ship when the player already has a ship', async () => {
    const testUser = TEST_USERS[11];
    const freeShip = SHIPS[0];

    await prisma.ship.create({ data: { profileId: testUser.id, shipId: freeShip.id } });

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<Test_BuyShipMutation, Test_BuyShipMutationVariables>(
      {
        query: gql`
          mutation Test_BuyShip($shipId: String!) {
            buyShip(shipId: $shipId) {
              id
              shipId
            }
          }
        `,
        variables: { shipId: freeShip.id },
      },
      context
    );

    expect(result.body.kind === 'single' && result.body.singleResult.errors?.[0]?.message).toBe(
      'player already has a ship'
    );
  });

  it('should buy a ship with coins', async () => {
    const testUser = TEST_USERS[12];
    const coinShip = SHIPS[3];
    const initialCoins = coinShip.price.amount + 50;
    const expectedFinalCoins = initialCoins - coinShip.price.amount;

    await prisma.profile.update({ where: { userId: testUser.id }, data: { coins: initialCoins } });

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<Test_BuyShipMutation, Test_BuyShipMutationVariables>(
      {
        query: gql`
          mutation Test_BuyShip($shipId: String!) {
            buyShip(shipId: $shipId) {
              id
              shipId
            }
          }
        `,
        variables: { shipId: coinShip.id },
      },
      context
    );

    const ship = parseGQLData(result).buyShip;

    expect(ship?.shipId).toBe(coinShip.id);
    expect(ship?.id).toBeTruthy();

    const profile = await prisma.profile.findUnique({ where: { userId: testUser.id } });
    expect(profile?.coins).toBe(expectedFinalCoins);

    const ships = await prisma.ship.findMany({ where: { profileId: testUser.id } });
    expect(ships).toHaveLength(1);
    expect(ships[0].shipId).toBe(coinShip.id);
  });

  it('should not buy a ship when there are not enough coins', async () => {
    const testUser = TEST_USERS[13];
    const coinShip = SHIPS[3];

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<Test_BuyShipMutation, Test_BuyShipMutationVariables>(
      {
        query: gql`
          mutation Test_BuyShip($shipId: String!) {
            buyShip(shipId: $shipId) {
              id
              shipId
            }
          }
        `,
        variables: { shipId: coinShip.id },
      },
      context
    );

    expect(result.body.kind === 'single' && result.body.singleResult.errors?.[0]?.message).toBe(
      'Not enough coins to buy this ship'
    );
  });

  it('should buy a ship with ore from the stash', async () => {
    const testUser = TEST_USERS[14];
    const oreShip = SHIPS[1];
    const oreId = oreShip.price.type;
    const oreCost = oreShip.price.amount;
    const initialOreQuantity = oreCost + 5;
    const expectedFinalOreQuantity = initialOreQuantity - oreCost;

    await prisma.item.create({
      data: { profileId: testUser.id, id: oreId, quantity: initialOreQuantity },
    });

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<Test_BuyShipMutation, Test_BuyShipMutationVariables>(
      {
        query: gql`
          mutation Test_BuyShip($shipId: String!) {
            buyShip(shipId: $shipId) {
              id
              shipId
            }
          }
        `,
        variables: { shipId: oreShip.id },
      },
      context
    );

    const ship = parseGQLData(result).buyShip;

    expect(ship?.shipId).toBe(oreShip.id);
    expect(ship?.id).toBeTruthy();

    const item = await prisma.item.findUnique({
      where: { profileId_id: { profileId: testUser.id, id: oreId } },
    });
    expect(item?.quantity).toBe(expectedFinalOreQuantity);

    const ships = await prisma.ship.findMany({ where: { profileId: testUser.id } });
    expect(ships).toHaveLength(1);
    expect(ships[0].shipId).toBe(oreShip.id);
  });

  it('should not buy a ship when there is not enough ore in the stash', async () => {
    const testUser = TEST_USERS[15];
    const oreShip = SHIPS[1];

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<Test_BuyShipMutation, Test_BuyShipMutationVariables>(
      {
        query: gql`
          mutation Test_BuyShip($shipId: String!) {
            buyShip(shipId: $shipId) {
              id
              shipId
            }
          }
        `,
        variables: { shipId: oreShip.id },
      },
      context
    );

    expect(result.body.kind === 'single' && result.body.singleResult.errors?.[0]?.message).toBe(
      'Not enough items in stash'
    );
  });

  it('should not buy a ship with an invalid ship id', async () => {
    const testUser = TEST_USERS[16];

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<Test_BuyShipMutation, Test_BuyShipMutationVariables>(
      {
        query: gql`
          mutation Test_BuyShip($shipId: String!) {
            buyShip(shipId: $shipId) {
              id
              shipId
            }
          }
        `,
        variables: { shipId: 'invalid-ship-id' },
      },
      context
    );

    expect(result.body.kind === 'single' && result.body.singleResult.errors?.[0]?.message).toBe(
      'invalid shipId'
    );
  });

  it('should select an owned ship', async () => {
    const testUser = TEST_USERS[18];
    const ships = await Promise.all([
      prisma.ship.create({ data: { profileId: testUser.id, shipId: SHIPS[0].id } }),
      prisma.ship.create({ data: { profileId: testUser.id, shipId: SHIPS[1].id } }),
    ]);

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<Test_SelectShipMutation, Test_SelectShipMutationVariables>(
      {
        query: gql`
          mutation Test_SelectShip($shipId: String!) {
            selectShip(shipId: $shipId) {
              selectedShipId
            }
          }
        `,
        variables: { shipId: ships[1].id },
      },
      context
    );

    const profile = parseGQLData(result).selectShip;

    expect(profile?.selectedShipId).toBe(ships[1].id);

    const dbProfile = await prisma.profile.findUnique({ where: { userId: testUser.id } });
    expect(dbProfile?.selectedShipId).toBe(ships[1].id);
  });

  it('should update the selected ship when selecting a different owned ship', async () => {
    const testUser = TEST_USERS[19];
    const ships = await Promise.all([
      prisma.ship.create({ data: { profileId: testUser.id, shipId: SHIPS[0].id } }),
      prisma.ship.create({ data: { profileId: testUser.id, shipId: SHIPS[1].id } }),
    ]);
    await prisma.profile.update({
      where: { userId: testUser.id },
      data: { selectedShipId: ships[0].id },
    });

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<Test_SelectShipMutation, Test_SelectShipMutationVariables>(
      {
        query: gql`
          mutation Test_SelectShip($shipId: String!) {
            selectShip(shipId: $shipId) {
              selectedShipId
            }
          }
        `,
        variables: { shipId: ships[1].id },
      },
      context
    );

    const profile = parseGQLData(result).selectShip;

    expect(profile?.selectedShipId).toBe(ships[1].id);
  });

  it('should not select a ship that is not owned by the profile', async () => {
    const testUser = TEST_USERS[20];
    const otherUser = TEST_USERS[21];
    const otherUsersShip = await prisma.ship.create({
      data: { profileId: otherUser.id, shipId: SHIPS[0].id },
    });

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<Test_SelectShipMutation, Test_SelectShipMutationVariables>(
      {
        query: gql`
          mutation Test_SelectShip($shipId: String!) {
            selectShip(shipId: $shipId) {
              selectedShipId
            }
          }
        `,
        variables: { shipId: otherUsersShip.id },
      },
      context
    );

    expect(result.body.kind === 'single' && result.body.singleResult.errors?.[0]?.message).toBe(
      'ship not found or not owned by this profile'
    );

    const dbProfile = await prisma.profile.findUnique({ where: { userId: testUser.id } });
    expect(dbProfile?.selectedShipId).toBeNull();
  });

  it('should not select a ship with a non-existent ship id', async () => {
    const testUser = TEST_USERS[22];

    const context = makeDefaultContext();
    context.contextValue.user = makeTestContextUser(testUser);

    const result = await server.executeOperation<Test_SelectShipMutation, Test_SelectShipMutationVariables>(
      {
        query: gql`
          mutation Test_SelectShip($shipId: String!) {
            selectShip(shipId: $shipId) {
              selectedShipId
            }
          }
        `,
        variables: { shipId: 'non-existent-ship-id' },
      },
      context
    );

    expect(result.body.kind === 'single' && result.body.singleResult.errors?.[0]?.message).toBe(
      'ship not found or not owned by this profile'
    );
  });
});
