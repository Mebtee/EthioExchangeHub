import { Injectable, Logger } from '@nestjs/common';
import { ScrapeExecutorService, type ScrapeJobResult } from '../services/scrape-executor.service';

export interface WorkerJob {
  data: {
    bankSlug: string;
    retryAttempt: number;
    maxRetries: number;
  };
  id?: string;
}

export interface WorkerResult {
  success: boolean;
  result: ScrapeJobResult;
}

@Injectable()
export class ScrapeWorker {
  private readonly logger = new Logger(ScrapeWorker.name);

  constructor(private readonly executor: ScrapeExecutorService) {}

  /**
   * Process a single bank scrape job.
   * Implements retry with exponential backoff.
   */
  async process(job: WorkerJob): Promise<WorkerResult> {
    const { bankSlug, retryAttempt, maxRetries } = job.data;

    this.logger.log(`Processing ${bankSlug} (attempt ${retryAttempt + 1}/${maxRetries + 1})`);

    const result = await this.executor.executeForBank(bankSlug, retryAttempt);

    if (!result.success && retryAttempt < maxRetries) {
      const nextAttempt = retryAttempt + 1;
      const backoffMs = this.calculateBackoff(nextAttempt);

      this.logger.warn(
        `${bankSlug} failed, retry ${nextAttempt}/${maxRetries} in ${backoffMs}ms`,
      );

      // Wait for backoff and retry
      await this.delay(backoffMs);
      return this.process({
        data: { bankSlug, retryAttempt: nextAttempt, maxRetries },
        id: job.id,
      });
    }

    return { success: result.success, result };
  }

  /**
   * Exponential backoff: 10s, 20s, 40s
   */
  private calculateBackoff(attempt: number): number {
    return Math.min(10_000 * Math.pow(2, attempt - 1), 60_000);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
