import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MetricPoint {
  timestamp: string;
  value: number;
  unit: string;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private readonly requestTimings: Map<string, number[]> = new Map();
  private readonly errorCounts: Map<string, number> = new Map();
  private startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  recordRequestTiming(path: string, durationMs: number) {
    const timings = this.requestTimings.get(path) ?? [];
    timings.push(durationMs);
    // Keep only last 100 timings per path
    if (timings.length > 100) timings.shift();
    this.requestTimings.set(path, timings);
  }

  recordError(code: string) {
    this.errorCounts.set(code, (this.errorCounts.get(code) ?? 0) + 1);
  }

  getAverageLatency(path?: string): MetricPoint {
    let allTimings: number[] = [];
    if (path) {
      allTimings = this.requestTimings.get(path) ?? [];
    } else {
      for (const timings of this.requestTimings.values()) {
        allTimings = allTimings.concat(timings);
      }
    }

    const avg = allTimings.length > 0
      ? allTimings.reduce((a, b) => a + b, 0) / allTimings.length
      : 0;

    return {
      timestamp: new Date().toISOString(),
      value: Math.round(avg),
      unit: 'ms',
    };
  }

  getP95Latency(): MetricPoint {
    const allTimings: number[] = [];
    for (const timings of this.requestTimings.values()) {
      allTimings.push(...timings);
    }

    if (allTimings.length === 0) {
      return { timestamp: new Date().toISOString(), value: 0, unit: 'ms' };
    }

    allTimings.sort((a, b) => a - b);
    const idx = Math.ceil(allTimings.length * 0.95) - 1;
    return {
      timestamp: new Date().toISOString(),
      value: allTimings[idx] ?? 0,
      unit: 'ms',
    };
  }

  getErrorRate(): MetricPoint {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((a, b) => a + b, 0);
    const totalRequests = Array.from(this.requestTimings.values())
      .reduce((sum, timings) => sum + timings.length, 0);

    const rate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    return {
      timestamp: new Date().toISOString(),
      value: Math.round(rate * 100) / 100,
      unit: '%',
    };
  }

  getUptime(): MetricPoint {
    return {
      timestamp: new Date().toISOString(),
      value: Math.floor((Date.now() - this.startTime) / 1000),
      unit: 'seconds',
    };
  }

  async getSystemMetrics() {
    const [userCount, rateCount, scrapeCount] = await Promise.all([
      this.prisma.user.count().catch(() => 0),
      this.prisma.exchangeRate.count().catch(() => 0),
      this.prisma.scrapeLog.count().catch(() => 0),
    ]);

    const memoryUsage = process.memoryUsage();

    return {
      uptime: this.getUptime(),
      averageLatency: this.getAverageLatency(),
      p95Latency: this.getP95Latency(),
      errorRate: this.getErrorRate(),
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
        rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
        unit: 'MB',
      },
      database: {
        users: userCount,
        exchangeRates: rateCount,
        scrapeLogs: scrapeCount,
      },
    };
  }
}
