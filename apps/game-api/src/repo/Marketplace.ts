import type { PrismaClient } from './prisma-client/client';
import { StashRepository } from './Stash';
import { ORE } from '@repo/core-game';

interface MarketplaceOrder {
  profileId: string;
  itemId: string;
  quantity: number;
}

export class MarketplaceRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /** Sell an item from the profile's stash in exchange for coins. Currently placeholder: price is 1 coin per item */
  async sellItem({ profileId, itemId, quantity }: MarketplaceOrder) {
    return this.prisma.$transaction(async (tx) => {
      const stashDb = new StashRepository(tx as PrismaClient);

      await stashDb.removeItemFromStash({ profileId, id: itemId, quantity });

      return tx.profile.update({
        where: { userId: profileId },
        // placeholder: price is 1 coin per item (ie: `quantity`)
        data: { coins: { increment: quantity } },
      });
    });
  }

  /** Buy an item, deducting coins from the profile and adding it to their stash. Currently placeholder: price per ore based on `weight` */
  async buyItem({ profileId, itemId, quantity }: MarketplaceOrder) {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    const oreKey = Object.keys(ORE).find((key) => ORE[key as keyof typeof ORE].id === itemId);
    // placeholder: price per ore based on `weight`
    const pricePerUnit = oreKey ? ORE[oreKey as keyof typeof ORE].weight : undefined;
    if (!pricePerUnit) {
      throw new Error('Invalid item ID');
    }

    const totalCost = quantity * pricePerUnit;

    return this.prisma.$transaction(async (tx) => {
      const [profile] = await tx.profile.updateManyAndReturn({
        where: { userId: profileId, coins: { gte: totalCost } },
        data: { coins: { decrement: totalCost } },
      });
      if (!profile) {
        throw new Error('Not enough coins to buy this item');
      }

      const stashDb = new StashRepository(tx as PrismaClient);
      await stashDb.storeItemInStash({ profileId, id: itemId, quantity });

      return profile;
    });
  }
}
