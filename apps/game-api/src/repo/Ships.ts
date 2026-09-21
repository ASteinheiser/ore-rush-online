import type { PrismaClient, Ship } from './prisma-client/client';
import { StashRepository } from './Stash';
import { SHIPS } from '@repo/core-game';

type CreateShipArgs = Omit<Ship, 'id' | 'createdAt' | 'updatedAt'>;

export class ShipsRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  getShipsByProfileId(profileId: string) {
    return this.prisma.ship.findMany({ where: { profileId } });
  }

  getUserOwnedShipById(id: string, profileId: string) {
    return this.prisma.ship.findUnique({ where: { id, profileId } });
  }

  removeShip(id: string) {
    return this.prisma.ship.delete({ where: { id } });
  }

  /** Sets the profile's active ship, ensuring it is owned by the requesting profile */
  async selectShip({ shipId, profileId }: { shipId: string; profileId: string }) {
    const ship = await this.getUserOwnedShipById(shipId, profileId);
    if (!ship) {
      throw new Error('ship not found or not owned by this profile');
    }

    return this.prisma.profile.update({
      where: { userId: profileId },
      data: { selectedShipId: shipId },
    });
  }

  /** Placeholder for future ship purchase/crafting logic.
   * This currently handles:
   * - giving free ships to players with no ships
   * - purchasing ships for coins
   * - crafting ships with ore */
  async buyShip({ shipId, profileId }: CreateShipArgs) {
    const ship = SHIPS.find((s) => s.id === shipId);
    if (!ship) {
      throw new Error('invalid shipId');
    }

    // only give players this free ship if they have no ships
    if (ship.price === null) {
      const ships = await this.getShipsByProfileId(profileId);
      if (ships.length > 0) {
        throw new Error('player already has a ship');
      }

      return this.prisma.ship.create({
        data: { shipId, profileId },
      });
    } // otherwise, check if the player can buy the ship
    else if (ship.price.type === 'coins') {
      // transaction to remove coins from player profile and create new ship
      return this.prisma.$transaction(async (tx) => {
        const [profile] = await tx.profile.updateManyAndReturn({
          where: { userId: profileId, coins: { gte: ship.price.amount } },
          data: { coins: { decrement: ship.price.amount } },
        });
        if (!profile) {
          throw new Error('Not enough coins to buy this ship');
        }

        return tx.ship.create({ data: { shipId, profileId } });
      });
    } else {
      // transaction to remove ore from stash and create new ship
      return this.prisma.$transaction(async (tx) => {
        const stashDb = new StashRepository(tx as PrismaClient);
        await stashDb.removeItemFromStash({
          profileId,
          id: ship.price.type,
          quantity: ship.price.amount,
        });

        return tx.ship.create({ data: { shipId, profileId } });
      });
    }
  }
}
