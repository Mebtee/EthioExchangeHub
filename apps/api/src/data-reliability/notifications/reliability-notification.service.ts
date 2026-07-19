import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ReliabilityNotification } from '../interfaces/data-reliability.interface';

@Injectable()
export class ReliabilityNotificationService {
  private readonly logger = new Logger(ReliabilityNotificationService.name);

  private readonly telegramBotToken: string;
  private readonly telegramChatId: string;
  private readonly webhookUrl: string;
  private readonly emailFrom: string;
  private readonly emailTo: string;
  private readonly smtpConfig: { host: string; port: number; user: string; pass: string } | null;
  private readonly isTelegramEnabled: boolean;
  private readonly isEmailEnabled: boolean;

  constructor(configService: ConfigService) {
    this.telegramBotToken = configService.get<string>('TELEGRAM_BOT_TOKEN', '');
    this.telegramChatId = configService.get<string>('TELEGRAM_CHAT_ID', '');
    this.webhookUrl = configService.get<string>('RELIABILITY_WEBHOOK_URL', '');
    this.emailFrom = configService.get<string>('SMTP_FROM', 'noreply@ethiobankshub.com');
    this.emailTo = configService.get<string>('RELIABILITY_EMAIL_TO', '');
    this.isTelegramEnabled = !!(this.telegramBotToken && this.telegramChatId);

    const smtpHost = configService.get<string>('SMTP_HOST', '');
    this.isEmailEnabled = !!(smtpHost && this.emailTo);
    this.smtpConfig = this.isEmailEnabled
      ? {
          host: smtpHost,
          port: configService.get<number>('SMTP_PORT', 587),
          user: configService.get<string>('SMTP_USER', ''),
          pass: configService.get<string>('SMTP_PASS', ''),
        }
      : null;
  }

  /**
   * Send a reliability notification through all configured channels.
   */
  async notify(notification: ReliabilityNotification): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.isTelegramEnabled) {
      promises.push(this.sendTelegram(notification));
    }

    if (this.isEmailEnabled) {
      promises.push(this.sendEmail(notification));
    }

    if (this.webhookUrl) {
      promises.push(this.sendWebhook(notification));
    }

    // Always log
    this.logNotification(notification);

    await Promise.allSettled(promises);
  }

  private async sendTelegram(notification: ReliabilityNotification): Promise<void> {
    const emojis: Record<string, string> = {
      SCRAPE_FAILURE: '🚨',
      PARSER_FAILURE: '🔴',
      LOW_CONFIDENCE: '⚠️',
      HTML_CHANGED: '🔧',
      NO_DATA_BY_0900: '⏰',
      DUPLICATE_DATA: '🔄',
      MISSING_CURRENCIES: '❓',
      VALIDATION_FAILURE: '❌',
    };

    const emoji = emojis[notification.type] ?? '🔔';
    const severityLabel = notification.severity;

    const message = [
      `<b>${emoji} [${severityLabel}] ${notification.type}</b>`,
      '',
      `<b>Bank:</b> ${notification.bankName}`,
      `<b>Message:</b> ${notification.message}`,
      notification.details ? `<b>Details:</b> <code>${JSON.stringify(notification.details, null, 2)}</code>` : '',
      `<b>Time:</b> ${new Date().toLocaleString('en-ET', { timeZone: 'Africa/Addis_Ababa' })}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await fetch(`https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.telegramChatId,
          text: message,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });
    } catch (error) {
      this.logger.error(`Telegram notification failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  private async sendWebhook(notification: ReliabilityNotification): Promise<void> {
    try {
      await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'reliability_alert',
          ...notification,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      this.logger.error(`Webhook notification failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  private async sendEmail(notification: ReliabilityNotification): Promise<void> {
    try {
      const severityColors: Record<string, string> = {
        LOW: '#6b7280',
        MEDIUM: '#f59e0b',
        HIGH: '#ef4444',
        CRITICAL: '#dc2626',
      };

      const html = [
        `<!DOCTYPE html><html><head><meta charset="utf-8"><style>`,
        `body { font-family: Arial, sans-serif; padding: 20px; color: #333; }`,
        `.header { padding: 15px; background: ${severityColors[notification.severity] ?? '#6b7280'}; color: white; border-radius: 5px; }`,
        `.content { padding: 15px; line-height: 1.6; }`,
        `.details { background: #f3f4f6; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px; overflow-x: auto; }`,
        `.footer { margin-top: 20px; font-size: 11px; color: #9ca3af; }`,
        `</style></head><body>`,
        `<div class="header"><h2>[${notification.severity}] ${notification.type}</h2></div>`,
        `<div class="content">`,
        `<p><strong>Bank:</strong> ${notification.bankName}</p>`,
        `<p><strong>Message:</strong> ${notification.message}</p>`,
        notification.details ? `<div class="details"><pre>${JSON.stringify(notification.details, null, 2)}</pre></div>` : '',
        `</div>`,
        `<div class="footer">EthioBanksHub Reliability Alert — ${new Date().toISOString()}</div>`,
        `</body></html>`,
      ].join('\n');

      // Use fetch to send via Mailgun-compatible API or SMTP relay
      const response = await fetch(`https://api.mailgun.net/v3/${this.smtpConfig!.host}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.smtpConfig!.pass}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          from: this.emailFrom,
          to: this.emailTo,
          subject: `[${notification.severity}] EthioBanksHub — ${notification.type}: ${notification.bankName}`,
          html,
        }),
      });

      if (response.ok) {
        this.logger.log(`Email notification sent to ${this.emailTo}`);
      } else {
        this.logger.warn(`Email notification failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      this.logger.error(`Email notification error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }

  private logNotification(notification: ReliabilityNotification): void {
    const logLevel = notification.severity === 'CRITICAL' || notification.severity === 'HIGH'
      ? 'warn'
      : 'log';
    this.logger[logLevel](
      `[${notification.severity}] ${notification.type}: ${notification.bankName} — ${notification.message}`,
    );
  }

  /**
   * Send notification when no data collected by 09:00 EAT.
   */
  async notifyNoDataBy0900(banksWithNoData: string[]): Promise<void> {
    if (banksWithNoData.length === 0) return;

    await this.notify({
      type: 'NO_DATA_BY_0900',
      severity: 'HIGH',
      bankName: banksWithNoData.join(', '),
      message: `${banksWithNoData.length} bank(s) have no data by 09:00 EAT`,
      details: { banks: banksWithNoData },
    });
  }
}
