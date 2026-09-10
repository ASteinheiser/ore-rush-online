import type { PrismaClient, Item } from './prisma-client/client';

type ItemWithoutTimestamps = Omit<Item, 'createdAt' | 'updatedAt'>;

export class StashRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  getItemsByProfileId(profileId: string) {
    return this.prisma.item.findMany({ where: { profileId } });
  }

  storeItemInStash(item: ItemWithoutTimestamps) {
    if (item.quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    return this.prisma.item.upsert({
      where: {
        profileId_id: {
          profileId: item.profileId,
          id: item.id,
        },
      },
      create: {
        profileId: item.profileId,
        id: item.id,
        quantity: item.quantity,
      },
      update: {
        quantity: { increment: item.quantity },
      },
    });
  }

  storeItemsInStash(items: ItemWithoutTimestamps[]) {
    return this.prisma.$transaction(items.map((item) => this.storeItemInStash(item)));
  }

  async removeItemFromStash(item: ItemWithoutTimestamps) {
    if (item.quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.item.updateManyAndReturn({
        where: {
          profileId: item.profileId,
          id: item.id,
          quantity: { gte: item.quantity },
        },
        data: {
          quantity: { decrement: item.quantity },
        },
      }),
      this.prisma.item.deleteMany({
        where: {
          profileId: item.profileId,
          id: item.id,
          quantity: { lte: 0 },
        },
      }),
    ]);

    const remaining = updated[0];
    return remaining?.quantity > 0 ? remaining : null;
  }
}
