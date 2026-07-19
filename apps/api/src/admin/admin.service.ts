import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Dashboard Overview ──────────────────────────────────────
  async getDashboardOverview() {
    const [
      totalUsers,
      activeAlerts,
      totalBanks,
      recentScrapes,
      totalSubscriptions,
      latestRatesCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.rateAlert.count({ where: { isActive: true } }),
      this.prisma.bank.count({ where: { isActive: true } }),
      this.prisma.scrapeLog.count(),
      this.prisma.subscription.count({ where: { isActive: true } }),
      this.prisma.exchangeRate.count(),
    ]);

    return {
      totalUsers,
      activeAlerts,
      totalBanks,
      totalScrapes: recentScrapes,
      totalSubscriptions,
      totalRates: latestRatesCount,
    };
  }

  // ── Rate Editor ─────────────────────────────────────────────
  async getRates(page = 1, limit = 20, bankCode?: string, currencyTo?: string) {
    const where: any = {};
    if (bankCode) where.bank = { code: bankCode };
    if (currencyTo) where.currencyTo = currencyTo;

    const [rates, total] = await Promise.all([
      this.prisma.exchangeRate.findMany({
        where,
        include: { bank: { select: { id: true, name: true, code: true } } },
        orderBy: { effectiveDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.exchangeRate.count({ where }),
    ]);

    return {
      data: rates,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      banks: await this.prisma.bank.findMany({
        where: { isActive: true },
        select: { code: true, name: true },
        orderBy: { sortOrder: 'asc' },
      }),
    };
  }

  async updateRate(id: string, data: { buyRate?: number; sellRate?: number; source?: string }) {
    const updateData: any = {};
    if (data.buyRate !== undefined) updateData.buyRate = data.buyRate;
    if (data.sellRate !== undefined) updateData.sellRate = data.sellRate;
    if (data.source !== undefined) updateData.source = data.source;

    return this.prisma.exchangeRate.update({
      where: { id },
      data: updateData,
      include: { bank: { select: { name: true, code: true } } },
    });
  }

  async deleteRate(id: string) {
    await this.prisma.exchangeRate.delete({ where: { id } });
    return { message: 'Rate deleted' };
  }

  async createRate(data: {
    bankId: string;
    currencyFrom: string;
    currencyTo: string;
    buyRate: number;
    sellRate: number;
    source?: string;
  }) {
    return this.prisma.exchangeRate.create({
      data: {
        bankId: data.bankId,
        currencyFrom: data.currencyFrom as any,
        currencyTo: data.currencyTo as any,
        buyRate: data.buyRate,
        sellRate: data.sellRate,
        source: data.source ?? 'manual',
      },
      include: { bank: { select: { name: true, code: true } } },
    });
  }

  // ── Bank Management ─────────────────────────────────────────
  async getBanks(page = 1, limit = 50) {
    const [banks, total] = await Promise.all([
      this.prisma.bank.findMany({
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { exchangeRates: true, services: true, rateAlerts: true } },
        },
      }),
      this.prisma.bank.count(),
    ]);
    return { data: banks, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateBank(id: string, data: {
    name?: string; swiftCode?: string; website?: string;
    phone?: string; email?: string; address?: string;
    isActive?: boolean; sortOrder?: number;
  }) {
    return this.prisma.bank.update({ where: { id }, data });
  }

  // ── User Management ─────────────────────────────────────────
  async getUsers(page = 1, limit = 20, search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, email: true, fullName: true, role: true,
          isVerified: true, phoneNumber: true, preferredLang: true,
          lastLoginAt: true, createdAt: true,
          _count: { select: { rateAlerts: true, subscriptions: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateUserRole(userId: string, role: 'USER' | 'ADMIN') {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, fullName: true, role: true },
    });
  }

  // ── Subscription Management ──────────────────────────────────
  async getSubscriptions(page = 1, limit = 20) {
    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          bank: { select: { name: true, code: true } },
          service: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.subscription.count(),
    ]);
    return { data: subscriptions, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateSubscription(id: string, data: { tier?: string; isActive?: boolean; notificationType?: string }) {
    return this.prisma.subscription.update({ where: { id }, data: data as any });
  }

  // ── Rankings Management ─────────────────────────────────────
  async getRankings(category?: string) {
    const where: any = {};
    if (category) where.category = category;

    const rankings = await this.prisma.ranking.findMany({
      where,
      include: { bank: { select: { name: true, code: true } } },
      orderBy: [{ effectiveDate: 'desc' }, { rankPosition: 'asc' }],
      take: 100,
    });

    return { data: rankings };
  }

  async updateRanking(id: string, data: { score?: number; rankPosition?: number; previousRank?: number }) {
    return this.prisma.ranking.update({ where: { id }, data });
  }

  async createRanking(data: {
    category: string; bankId: string; score: number;
    rankPosition: number; previousRank?: number; criteria?: any;
  }) {
    return this.prisma.ranking.create({
      data: {
        category: data.category as any,
        bankId: data.bankId,
        score: data.score,
        rankPosition: data.rankPosition,
        previousRank: data.previousRank,
        criteria: data.criteria ?? {},
        effectiveDate: new Date(),
      },
      include: { bank: { select: { name: true, code: true } } },
    });
  }

  // ── Logs ────────────────────────────────────────────────────
  async getLogs(page = 1, limit = 50, status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      this.prisma.scrapeLog.findMany({
        where,
        include: { bank: { select: { name: true, code: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.scrapeLog.count({ where }),
    ]);

    return { data: logs, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ── Alert Queue ────────────────────────────────────────────
  async getAlertQueue(page = 1, limit = 20, status?: string) {
    const where: any = {};
    if (status === 'active') where.isActive = true;
    else if (status === 'inactive') where.isActive = false;

    const [alerts, total] = await Promise.all([
      this.prisma.rateAlert.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          bank: { select: { name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.rateAlert.count({ where }),
    ]);

    return { data: alerts, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async toggleAlert(id: string) {
    const alert = await this.prisma.rateAlert.findUnique({ where: { id } });
    if (!alert) throw new Error('Alert not found');
    return this.prisma.rateAlert.update({
      where: { id },
      data: { isActive: !alert.isActive },
    });
  }

  // ── Revenue Dashboard ───────────────────────────────────────
  async getRevenueDashboard() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalUsers,
      newUsersThisMonth,
      totalActiveSubscriptions,
      basicSubscriptions,
      premiumSubscriptions,
      enterpriseSubscriptions,
      usersByRole,
      alertsCreated,
      scrapeSuccessRate,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.subscription.count({ where: { isActive: true } }),
      this.prisma.subscription.count({ where: { tier: 'BASIC', isActive: true } }),
      this.prisma.subscription.count({ where: { tier: 'PREMIUM', isActive: true } }),
      this.prisma.subscription.count({ where: { tier: 'ENTERPRISE', isActive: true } }),
      this.prisma.user.groupBy({ by: ['role'], _count: true }),
      this.prisma.rateAlert.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.scrapeLog.count({ where: { status: 'SUCCESS' } }).then(
        (success) =>
          this.prisma.scrapeLog.count().then(
            (total) => (total > 0 ? Math.round((success / total) * 100) : 0),
          ),
      ),
    ]);

    // Revenue estimates (simplified)
    const monthlyRecurringRevenue =
      basicSubscriptions * 9.99 +
      premiumSubscriptions * 29.99 +
      enterpriseSubscriptions * 99.99;

    return {
      users: { total: totalUsers, newThisMonth: newUsersThisMonth },
      subscriptions: {
        active: totalActiveSubscriptions,
        breakdown: { basic: basicSubscriptions, premium: premiumSubscriptions, enterprise: enterpriseSubscriptions },
        estimatedMrr: Math.round(monthlyRecurringRevenue * 100) / 100,
        estimatedArr: Math.round(monthlyRecurringRevenue * 12 * 100) / 100,
      },
      activity: {
        alertsCreatedThisMonth: alertsCreated,
        scrapeSuccessRate: `${scrapeSuccessRate}%`,
      },
      usersByRole,
    };
  }
}
