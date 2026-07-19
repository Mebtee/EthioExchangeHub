import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly enabled: boolean;

  constructor(configService: ConfigService) {
    this.botToken = configService.get<string>('scraper.telegramBotToken', '');
    this.chatId = configService.get<string>('scraper.telegramChatId', '');
    this.enabled = !!(this.botToken && this.chatId);
  }

  /**
   * Send a failure alert to the configured Telegram chat.
   */
  async sendFailureAlert(
    bankName: string,
    errorMessage: string,
    retryAttempt: number,
    durationMs: number,
  ): Promise<void> {
    if (!this.enabled) {
      this.logger.warn(
        `Telegram not configured. Would send alert for ${bankName}: ${errorMessage}`,
      );
      return;
    }

    const message = this.formatAlert(bankName, errorMessage, retryAttempt, durationMs);

    try {
      await fetch(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.chatId,
            text: message,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        },
      );
      this.logger.log(`Telegram alert sent for ${bankName}`);
    } catch (error) {
      this.logger.error(
        `Failed to send Telegram alert: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  /**
   * Send a daily summary of all scrape results.
   */
  async sendDailySummary(
    successCount: number,
    failedCount: number,
    totalDuration: number,
    details: { bank: string; status: string; duration: number }[],
  ): Promise<void> {
    if (!this.enabled) return;

    const summary = details
      .map((d) => `  • ${d.bank}: ${d.status} (${(d.duration / 1000).toFixed(1)}s)`)
      .join('\n');

    const message = [
      '<b>📊 EthioBanksHub Daily Scrape Report</b>',
      '',
      `✅ Success: ${successCount}  |  ❌ Failed: ${failedCount}`,
      `⏱ Total: ${(totalDuration / 1000).toFixed(1)}s`,
      '',
      summary,
    ].join('\n');

    try {
      await fetch(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.chatId,
            text: message,
            parse_mode: 'HTML',
          }),
        },
      );
    } catch (error) {
      this.logger.error(`Failed to send daily summary: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  private formatAlert(
    bankName: string,
    error: string,
    retryAttempt: number,
    durationMs: number,
  ): string {
    return [
      `<b>🚨 Scrape Failed: ${bankName}</b>`,
      '',
      `<b>Error:</b> ${error}`,
      `<b>Retry:</b> ${retryAttempt}/3`,
      `<b>Duration:</b> ${(durationMs / 1000).toFixed(1)}s`,
      `<b>Time:</b> ${new Date().toLocaleString('en-ET', { timeZone: 'Africa/Addis_Ababa' })}`,
    ].join('\n');
  }
}
