import { Controller, Get, VERSION_NEUTRAL, Inject, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from './prisma/prisma.service';
import { MonitoringService } from './monitoring/monitoring.service';

@ApiTags('Health')
@Controller({ version: VERSION_NEUTRAL })
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly monitoring: MonitoringService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check with DB, Redis, and system status' })
  async health() {
    const checks: Record<string, 'healthy' | 'unhealthy' | 'disabled'> = {};
    const start = Date.now();

    // Database health
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'healthy';
    } catch {
      checks.database = 'unhealthy';
    }

    // Redis health via cache manager
    try {
      await this.cacheManager.set('__health', 'ok', 10);
      const result = await this.cacheManager.get('__health');
      checks.redis = result === 'ok' ? 'healthy' : 'unhealthy';
    } catch {
      checks.redis = 'unhealthy';
    }

    const uptime = this.monitoring.getUptime();

    return {
      status: Object.values(checks).every((c) => c === 'healthy' || c === 'disabled')
        ? 'healthy'
        : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: uptime.value,
      uptimeHuman: this.formatUptime(uptime.value),
      version: '1.0.0',
      environment: process.env['NODE_ENV'] ?? 'development',
      checks,
      responseTime: `${Date.now() - start}ms`,
    };
  }

  @Get('health/live')
  @ApiOperation({ summary: 'Kubernetes liveness probe' })
  live() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  @Get('health/ready')
  @ApiOperation({ summary: 'Kubernetes readiness probe' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'not ready', timestamp: new Date().toISOString() };
    }
  }

  @Get('metrics')
  @ApiOperation({ summary: 'System metrics for monitoring' })
  async metrics() {
    return this.monitoring.getSystemMetrics();
  }

  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    parts.push(`${secs}s`);
    return parts.join(' ');
  }
}
