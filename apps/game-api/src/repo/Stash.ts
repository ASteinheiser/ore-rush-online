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
    const [, , remaining] = await this.prisma.$transaction([
      this.prisma.item.updateMany({
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
      this.prisma.item.findUnique({
        where: {
          profileId_id: {
            profileId: item.profileId,
            id: item.id,
          },
        },
      }),
    ]);

    return remaining;
  }
}
