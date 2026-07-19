import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { redisStore } from 'cache-manager-redis-yet';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    // ── Environment Configuration ──────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '../../.env'],
    }),

    // ── Rate Limiting ──────────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 60, // 60 requests per minute
      },
    ]),

    // ── Redis Caching ──────────────────────────────────────────
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          url: config.get<string>('redis.url'),
          ttl: 300, // 5 minutes default
        }),
      }),
    }),

    // ── Application Modules ────────────────────────────────────
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
