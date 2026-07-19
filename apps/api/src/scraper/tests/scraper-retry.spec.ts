import { ScrapeWorker, type WorkerJob } from '../workers/scrape.worker';

describe('ScrapeWorker Retry Logic', () => {
  let worker: ScrapeWorker;
  let mockExecutor: any;

  beforeEach(async () => {
    mockExecutor = {
      executeForBank: jest.fn(),
    };
    worker = new ScrapeWorker(mockExecutor);
  });

  it('should be defined', () => {
    expect(worker).toBeDefined();
  });

  describe('process with retries', () => {
    it('should succeed on first attempt', async () => {
      mockExecutor.executeForBank.mockResolvedValue({
        success: true,
        bankSlug: 'TEST',
        bankName: 'Test Bank',
        ratesCount: 5,
        errors: [],
        warnings: [],
        durationMs: 100,
      });

      const job: WorkerJob = {
        data: { bankSlug: 'TEST', retryAttempt: 0, maxRetries: 3 },
      };

      const result = await worker.process(job);
      expect(result.success).toBe(true);
      expect(mockExecutor.executeForBank).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure', async () => {
      jest.useFakeTimers();

      try {
        mockExecutor.executeForBank
          .mockResolvedValueOnce({
            success: false, bankSlug: 'TEST', bankName: 'Test', ratesCount: 0,
            errors: ['Error'], warnings: [], durationMs: 100,
          })
          .mockResolvedValueOnce({
            success: true, bankSlug: 'TEST', bankName: 'Test', ratesCount: 5,
            errors: [], warnings: [], durationMs: 200,
          });

        const job: WorkerJob = {
          data: { bankSlug: 'TEST', retryAttempt: 0, maxRetries: 3 },
        };

        // Start the process promise
        const processPromise = worker.process(job);

        // Fast-forward past exponential backoff timers
        jest.advanceTimersByTimeAsync(15_000);

        const result = await processPromise;
        expect(result.success).toBe(true);
        expect(mockExecutor.executeForBank).toHaveBeenCalledTimes(2);
      } finally {
        jest.useRealTimers();
      }
    }, 10_000);

    it('should eventually fail after max retries', async () => {
      jest.useFakeTimers();

      try {
        mockExecutor.executeForBank.mockResolvedValue({
          success: false,
          bankSlug: 'TEST',
          bankName: 'Test',
          ratesCount: 0,
          errors: ['Persistent error'],
          warnings: [],
          durationMs: 100,
        });

        const job: WorkerJob = {
          data: { bankSlug: 'TEST', retryAttempt: 0, maxRetries: 2 },
        };

        // Start the process promise
        const processPromise = worker.process(job);

        // Fast-forward through all backoff timers
        jest.advanceTimersByTimeAsync(100_000);

        const result = await processPromise;
        expect(result.success).toBe(false);
        // First attempt + 2 retries = 3 calls
        expect(mockExecutor.executeForBank).toHaveBeenCalledTimes(3);
      } finally {
        jest.useRealTimers();
      }
    }, 10_000);
  });

  describe('backoff calculation', () => {
    it('should calculate exponential backoff', () => {
      const workerInstance = new ScrapeWorker({ executeForBank: jest.fn() });
      const calcBackoff = (workerInstance as any).calculateBackoff;

      expect(calcBackoff(1)).toBe(10_000);  // 10s
      expect(calcBackoff(2)).toBe(20_000);  // 20s
      expect(calcBackoff(3)).toBe(40_000);  // 40s
      expect(calcBackoff(4)).toBe(60_000);  // capped at 60s
    });
  });
});
