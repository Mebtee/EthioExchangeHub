import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotificationService } from '../services/notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockConfig: any;

  beforeEach(async () => {
    mockConfig = {
      get: jest.fn((key: string, defaultValue?: any) => {
        if (key === 'scraper.telegramBotToken') return '';
        if (key === 'scraper.telegramChatId') return '';
        return defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendFailureAlert', () => {
    it('should handle disabled telegram gracefully', async () => {
      // Should not throw when telegram is not configured
      await expect(
        service.sendFailureAlert('Test Bank', 'Test error', 0, 100),
      ).resolves.not.toThrow();
    });
  });

  describe('sendDailySummary', () => {
    it('should handle disabled telegram gracefully', async () => {
      await expect(
        service.sendDailySummary(5, 1, 10000, [
          { bank: 'Bank A', status: '✅', duration: 5000 },
          { bank: 'Bank B', status: '❌', duration: 5000 },
        ]),
      ).resolves.not.toThrow();
    });
  });

  describe('with telegram configured', () => {
    beforeEach(() => {
      mockConfig.get = jest.fn((key: string, defaultValue?: any) => {
        if (key === 'scraper.telegramBotToken') return 'test-token';
        if (key === 'scraper.telegramChatId') return 'test-chat';
        return defaultValue;
      });

      // Recreate service with new config
      service = new NotificationService(mockConfig as any);
    });

    it('should send alert via HTTP', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      await service.sendFailureAlert('Test Bank', 'Test error', 1, 500);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.telegram.org'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('Test Bank'),
        }),
      );
    });

    it('should handle fetch failure gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        service.sendFailureAlert('Test Bank', 'Error', 0, 100),
      ).resolves.not.toThrow();
    });
  });
});
