import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with bank names if type is BANK
    const enriched = await Promise.all(
      favorites.map(async (fav) => {
        let label = fav.label;
        if (fav.type === 'BANK' && !label) {
          const bank = await this.prisma.bank.findUnique({
            where: { code: fav.referenceId },
            select: { name: true },
          });
          label = bank?.name ?? fav.referenceId;
        }
        return { ...fav, label };
      }),
    );

    return { data: enriched };
  }

  async create(
    userId: string,
    data: { type: 'BANK' | 'CURRENCY'; referenceId: string; label?: string },
  ) {
    // Prevent duplicates
    const existing = await this.prisma.favorite.findFirst({
      where: { userId, type: data.type, referenceId: data.referenceId },
    });

    if (existing) {
      return existing;
    }

    let label = data.label;
    if (!label && data.type === 'BANK') {
      const bank = await this.prisma.bank.findUnique({
        where: { code: data.referenceId },
        select: { name: true },
      });
      label = bank?.name ?? data.referenceId;
    }

    return this.prisma.favorite.create({
      data: {
        userId,
        type: data.type,
        referenceId: data.referenceId,
        label: label ?? data.referenceId,
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.prisma.favorite.deleteMany({
      where: { id, userId },
    });
  }

  async clearAll(userId: string) {
    await this.prisma.favorite.deleteMany({
      where: { userId },
    });
  }

  async toggle(
    userId: string,
    data: { type: 'BANK' | 'CURRENCY'; referenceId: string; label?: string },
  ) {
    const existing = await this.prisma.favorite.findFirst({
      where: { userId, type: data.type, referenceId: data.referenceId },
    });

    if (existing) {
      await this.prisma.favorite.delete({ where: { id: existing.id } });
      return { favorited: false, data: null };
    }

    const created = await this.create(userId, data);
    return { favorited: true, data: created };
  }

  async isFavorited(userId: string, type: 'BANK' | 'CURRENCY', referenceId: string): Promise<boolean> {
    const existing = await this.prisma.favorite.findFirst({
      where: { userId, type, referenceId },
    });
    return !!existing;
  }
}
