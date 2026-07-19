import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(query: string, limit: number) {
    const searchTerm = query.toLowerCase();

    const [banks, currencies, services] = await Promise.all([
      this.searchBanks(searchTerm, limit),
      this.searchCurrencies(searchTerm, limit),
      this.searchServices(searchTerm, limit),
    ]);

    return {
      data: {
        banks,
        currencies,
        services,
      },
    };
  }

  async getSuggestions(query: string) {
    const searchTerm = query.toLowerCase();
    const limit = 8;

    const [banks, currencies, services] = await Promise.all([
      this.searchBanks(searchTerm, limit),
      this.searchCurrencies(searchTerm, limit),
      this.searchServices(searchTerm, limit),
    ]);

    const suggestions = [
      ...banks.map((b: any) => ({
        id: b.id,
        type: 'bank' as const,
        label: b.name,
        sublabel: `Code: ${b.code}`,
        href: `/banks?code=${b.code}`,
      })),
      ...currencies.map((c) => ({
        id: c.code,
        type: 'currency' as const,
        label: c.code,
        sublabel: c.name,
        href: `/rates?currency=${c.code}`,
      })),
      ...services.map((s: any) => ({
        id: s.id,
        type: 'service' as const,
        label: s.name,
        sublabel: s.bank?.name ?? '',
        href: `/services`,
      })),
    ];

    return { data: suggestions.slice(0, 8) };
  }

  private async searchBanks(searchTerm: string, limit: number) {
    // Search by name or code
    return this.prisma.bank.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { code: { contains: searchTerm, mode: 'insensitive' } },
        ],
        isActive: true,
      },
      take: limit,
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        website: true,
        logoUrl: true,
        sortOrder: true,
        isActive: true,
      },
    });
  }

  private async searchCurrencies(searchTerm: string, limit: number) {
    const currencyNames: Record<string, string> = {
      USD: 'US Dollar',
      EUR: 'Euro',
      GBP: 'British Pound',
      SAR: 'Saudi Riyal',
      AED: 'UAE Dirham',
      CNY: 'Chinese Yuan',
      JPY: 'Japanese Yen',
      CHF: 'Swiss Franc',
      ETB: 'Ethiopian Birr',
    };

    return Object.entries(currencyNames)
      .filter(
        ([code, name]) =>
          code.toLowerCase().includes(searchTerm) ||
          name.toLowerCase().includes(searchTerm),
      )
      .slice(0, limit)
      .map(([code, name]) => ({ code, name }));
  }

  private async searchServices(searchTerm: string, limit: number) {
    return this.prisma.bankService.findMany({
      where: {
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { category: searchTerm.toUpperCase() as any },
        ],
        isActive: true,
      },
      take: limit,
      include: {
        bank: { select: { name: true, code: true } },
      },
    });
  }
}
