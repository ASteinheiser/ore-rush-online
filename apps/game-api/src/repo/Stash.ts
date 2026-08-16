import type { PrismaClient } from './prisma-client/client';

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
}
