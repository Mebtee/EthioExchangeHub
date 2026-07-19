import type { ScrapeJobResult } from '../services/scrape-executor.service';

export interface ScrapeJobData {
  bankSlug: string;
  retryAttempt: number;
  maxRetries: number;
}

export interface ScrapeJobResultData {
  bankSlug: string;
  success: boolean;
  result: ScrapeJobResult;
}
