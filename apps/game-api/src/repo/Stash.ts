import type { PrismaClient, Item } from './prisma-client/client';

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

  async storeItemInStash(item: Omit<Item, 'createdAt' | 'updatedAt'>) {
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
}
