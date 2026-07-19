import { Injectable } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';

import { type PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async health() {
    let dbStatus: 'healthy' | 'unhealthy' = 'healthy';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'unhealthy';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.config.get<string>('NODE_ENV', 'development'),
      services: {
        database: dbStatus,
        redis: 'pending', // will be checked once Redis module is connected
      },
    };
  }
}
