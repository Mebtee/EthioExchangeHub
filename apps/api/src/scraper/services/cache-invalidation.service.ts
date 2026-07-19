import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Invalidate all rate-related cache keys after a successful scrape.
   */
  async invalidateRateCaches(): Promise<void> {
    try {
      // Cache Manager doesn't support pattern-based deletion directly.
      // We use keys we know about from the caching layer.
      await this.cacheManager.del('rates:latest');
      await this.cacheManager.del('rates:summary');
      await this.cacheManager.del('rates:all');

      this.logger.log('Rate caches invalidated successfully');
    } catch (error) {
      this.logger.error(
        `Failed to invalidate caches: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  /**
   * Invalidate all caches (full reset after major update).
   */
  async invalidateAll(): Promise<void> {
    try {
      await this.cacheManager.reset();
      this.logger.log('All caches reset successfully');
    } catch (error) {
      this.logger.error(
        `Failed to reset caches: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }
}
