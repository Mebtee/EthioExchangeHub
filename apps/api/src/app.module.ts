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
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ScraperModule } from './scraper/scraper.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { FavoritesModule } from './favorites/favorites.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { MonitoringModule } from './monitoring/monitoring.module';
import { CsrfModule } from './csrf/csrf.module';
import { SearchModule } from './search/search.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UserNotificationsModule } from './user-notifications/user-notifications.module';
import { AdminModule } from './admin/admin.module';
import { DataReliabilityModule } from './data-reliability/data-reliability.module';

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

    // ── Caching (Redis or in-memory fallback) ───────────────────
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redisUrl = config.get<string>('redis.url', '');
        if (redisUrl) {
          try {
            const store = await redisStore({ url: redisUrl, ttl: 300 });
            return { store, ttl: 300 };
          } catch (error) {
            console.warn('Redis unavailable, falling back to in-memory cache:', (error as Error).message);
          }
        }
        return { ttl: 300 }; // In-memory cache fallback
      },
    }),

    // ── Application Modules ────────────────────────────────────
    AuthModule,
    UsersModule,
    ScraperModule,
    ExchangeRatesModule,
    FavoritesModule,
    PortfolioModule,
    SearchModule,
    NotificationsModule,
    UserNotificationsModule,
    AdminModule,
    DataReliabilityModule,
    MonitoringModule,
    CsrfModule,
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
