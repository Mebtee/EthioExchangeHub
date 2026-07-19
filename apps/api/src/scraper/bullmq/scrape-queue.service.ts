import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker } from 'bullmq';
import type { ScrapeJobData, ScrapeJobResultData } from '../jobs/scrape.job';
import { ScrapeExecutorService } from '../services/scrape-executor.service';

const QUEUE_NAME = 'bank-scraping';

@Injectable()
export class ScrapeQueueService {
  private readonly logger = new Logger(ScrapeQueueService.name);
  private readonly queue: Queue<ScrapeJobData, ScrapeJobResultData>;
  private readonly worker: Worker<ScrapeJobData, ScrapeJobResultData>;
  private readonly maxRetries: number;
  private readonly enabled: boolean;

  // Monitoring
  private completedJobs = 0;
  private failedJobs = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly executor: ScrapeExecutorService,
  ) {
    const redisUrl = this.configService.get<string>('redis.url', 'redis://localhost:6379');
    this.maxRetries = this.configService.get<number>('scraper.maxRetries', 3);
    this.enabled = this.configService.get<boolean>('scraper.enabled', true);

    const connection = { url: redisUrl };

    this.queue = new Queue<ScrapeJobData>(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: this.maxRetries + 1,
        backoff: { type: 'exponential', delay: 10_000 },
        timeout: 60_000, // 60 second timeout per job
        removeOnComplete: { age: 24 * 3600 },
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    });

    this.worker = new Worker<ScrapeJobData, ScrapeJobResultData>(
      QUEUE_NAME,
      async (job) => {
        const { bankSlug, retryAttempt } = job.data;
        this.logger.log(`Processing ${bankSlug} (attempt ${retryAttempt + 1})`);

        const result = await this.executor.executeForBank(bankSlug, retryAttempt);

        if (!result.success) {
          throw new Error(result.errors.join('; '));
        }

        return {
          bankSlug,
          success: true,
          result,
        };
      },
      {
        connection,
        concurrency: 5, // Process up to 5 banks simultaneously
        limiter: {
          max: 10,
          duration: 60_000, // 10 jobs per minute max
        },
      },
    );

    this.worker.on('completed', (job) => {
      this.completedJobs++;
      this.logger.log(`✅ ${job.data.bankSlug} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.failedJobs++;
      this.logger.error(`❌ ${job?.data.bankSlug} failed: ${err.message}`);
    });
  }

  /**
   * Add a single bank scrape job to the queue.
   */
  async addJob(bankSlug: string): Promise<void> {
    if (!this.enabled) return;

    await this.queue.add(`scrape-${bankSlug}`, {
      bankSlug,
      retryAttempt: 0,
      maxRetries: this.maxRetries,
    });
  }

  /**
   * Add scrape jobs for all active banks.
   */
  async addAllJobs(bankSlugs: string[]): Promise<void> {
    if (!this.enabled) return;

    const jobs = bankSlugs.map((slug) => ({
      name: `scrape-${slug}`,
      data: { bankSlug: slug, retryAttempt: 0, maxRetries: this.maxRetries } satisfies ScrapeJobData,
    }));

    await this.queue.addBulk(jobs);
    this.logger.log(`Added ${jobs.length} scrape jobs to queue`);
  }

  /**
   * Get queue metrics.
   */
  async getMetrics() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed: completed + this.completedJobs,
      failed: failed + this.failedJobs,
      delayed,
    };
  }

  /**
   * Gracefully close queue and worker.
   */
  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
  }
}
