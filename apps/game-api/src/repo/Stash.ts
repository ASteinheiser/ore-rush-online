import type { PrismaClient, Item } from './prisma-client/client';

type ItemWithoutTimestamps = Omit<Item, 'createdAt' | 'updatedAt'>;

export class StashRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async getStashByUserId(userId: string) {
    return this.prisma.profile.findUnique({
      where: { userId },
      include: { stash: true },
    });
  }

  async storeItemInStash(item: ItemWithoutTimestamps) {
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

  async removeItemFromStash(item: ItemWithoutTimestamps) {
    const [updated] = await this.prisma.$transaction([
      this.prisma.item.updateManyAndReturn({
        where: {
          profileId: item.profileId,
          id: item.id,
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
