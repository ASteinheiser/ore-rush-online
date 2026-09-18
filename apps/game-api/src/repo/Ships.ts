import type { PrismaClient, Ship } from './prisma-client/client';

type ShipWithoutTimestamps = Omit<Ship, 'createdAt' | 'updatedAt'>;

export class ShipsRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  getShipsByProfileId(profileId: string) {
    return this.prisma.ship.findMany({ where: { profileId } });
  }

  addShip(ship: ShipWithoutTimestamps) {
    return this.prisma.ship.create({
      data: {
        id: ship.id,
        shipId: ship.shipId,
        profileId: ship.profileId,
      },
    });
  }

  removeShip(id: string) {
    return this.prisma.ship.delete({ where: { id } });
  }
}
