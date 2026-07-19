import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const items = await this.prisma.portfolioItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return { data: items };
  }

  async getDashboard(userId: string) {
    const items = await this.prisma.portfolioItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Group by currency and compute totals
    const byCurrency = items.reduce(
      (acc, item) => {
        const curr = item.currency;
        if (!acc[curr]) acc[curr] = { currency: curr, totalAmount: 0, items: 0, types: new Set<string>() };
        acc[curr].totalAmount += Number(item.amount);
        acc[curr].items += 1;
        acc[curr].types.add(item.type);
        return acc;
      },
      {} as Record<string, { currency: string; totalAmount: number; items: number; types: Set<string> }>,
    );

    // Get latest exchange rates for each held currency
    const holdings = await Promise.all(
      Object.entries(byCurrency).map(async ([currency, info]) => {
        let etbValue = info.totalAmount;
        if (currency !== 'ETB') {
          const rate = await this.prisma.exchangeRate.findFirst({
            where: { currencyTo: currency as any },
            orderBy: { effectiveDate: 'desc' },
            select: { buyRate: true },
          });
          if (rate) {
            etbValue = info.totalAmount * Number(rate.buyRate);
          }
        }
        return {
          currency,
          totalAmount: info.totalAmount,
          items: info.items,
          types: Array.from(info.types),
          estimatedEtbValue: Math.round(etbValue * 100) / 100,
        };
      }),
    );

    const totalItems = items.length;
    const totalEtbValue = holdings.reduce((sum, h) => sum + h.estimatedEtbValue, 0);

    // Group by type
    const byType = items.reduce(
      (acc, item) => {
        const t = item.type;
        if (!acc[t]) acc[t] = { type: t, count: 0, total: 0 };
        acc[t].count += 1;
        acc[t].total += Number(item.amount);
        return acc;
      },
      {} as Record<string, { type: string; count: number; total: number }>,
    );

    return {
      data: {
        summary: {
          totalItems,
          totalEtbValue: Math.round(totalEtbValue * 100) / 100,
          currenciesHeld: holdings.length,
        },
        holdings,
        byType: Object.values(byType),
        items,
      },
    };
  }

  async create(
    userId: string,
    data: {
      type: 'CURRENCY_HOLDING' | 'BANK_ACCOUNT' | 'INVESTMENT' | 'OTHER';
      currency: string;
      amount: number;
      description?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.prisma.portfolioItem.create({
      data: {
        userId,
        type: data.type,
        currency: data.currency,
        amount: data.amount,
        description: data.description,
        metadata: data.metadata ?? {},
      },
    });
  }

  async update(
    userId: string,
    id: string,
    data: { amount?: number; description?: string; metadata?: Record<string, unknown> },
  ) {
    const item = await this.prisma.portfolioItem.findFirst({
      where: { id, userId },
    });
    if (!item) throw new NotFoundException('Portfolio item not found');

    return this.prisma.portfolioItem.update({
      where: { id },
      data,
    });
  }

  async remove(userId: string, id: string) {
    const item = await this.prisma.portfolioItem.findFirst({
      where: { id, userId },
    });
    if (!item) throw new NotFoundException('Portfolio item not found');

    await this.prisma.portfolioItem.delete({ where: { id } });
  }
}
