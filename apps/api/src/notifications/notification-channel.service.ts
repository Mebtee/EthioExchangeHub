import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ── Interfaces ─────────────────────────────────────────────────
export interface NotificationPayload {
  userId?: string;
  userEmail?: string;
  userPhone?: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  metadata?: Record<string, unknown>;
}

export interface NotificationChannel {
  readonly name: string;
  send(payload: NotificationPayload): Promise<boolean>;
}

// ── Telegram Channel ───────────────────────────────────────────
@Injectable()
export class TelegramChannel implements NotificationChannel {
  readonly name = 'telegram';
  private readonly logger = new Logger(TelegramChannel.name);
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly enabled: boolean;

  constructor(configService: ConfigService) {
    this.botToken = configService.get<string>('scraper.telegramBotToken', '');
    this.chatId = configService.get<string>('scraper.telegramChatId', '');
    this.enabled = !!(this.botToken && this.chatId);
  }

  async send(payload: NotificationPayload): Promise<boolean> {
    if (!this.enabled) {
      this.logger.debug(`Telegram not configured. Would send: ${payload.title}`);
      return false;
    }

    const emojiMap: Record<string, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚨',
      success: '✅',
    };
    const emoji = emojiMap[payload.severity] ?? '📢';

    const text = [
      `<b>${emoji} ${this.escapeHtml(payload.title)}</b>`,
      '',
      this.escapeHtml(payload.message),
      '',
      ...(payload.metadata
        ? Object.entries(payload.metadata).map(
            ([k, v]) => `<b>${this.escapeHtml(k)}:</b> ${this.escapeHtml(String(v))}`,
          )
        : []),
    ].join('\n');

    try {
      const res = await fetch(
        `https://api.telegram.org/bot${this.botToken}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.chatId,
            text,
            parse_mode: 'HTML',
            disable_web_page_preview: true,
          }),
        },
      );

      if (!res.ok) {
        const errBody = await res.text();
        this.logger.error(`Telegram API error: ${errBody}`);
        return false;
      }

      this.logger.log(`Telegram notification sent: ${payload.title}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send Telegram: ${(error as Error).message}`);
      return false;
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}

// ── Email Channel (SMTP) ───────────────────────────────────────
@Injectable()
export class EmailChannel implements NotificationChannel {
  readonly name = 'email';
  private readonly logger = new Logger(EmailChannel.name);
  private readonly fromAddress: string;
  private readonly apiKey: string;
  private readonly enabled: boolean;

  constructor(configService: ConfigService) {
    this.fromAddress = configService.get<string>('email.fromAddress', 'noreply@ethiobankshub.com');
    this.apiKey = configService.get<string>('email.apiKey', '');
    this.enabled = !!this.apiKey;
  }

  async send(payload: NotificationPayload): Promise<boolean> {
    if (!this.enabled || !payload.userEmail) {
      this.logger.debug(`Email not configured or no recipient. Would send to ${payload.userEmail}: ${payload.title}`);
      return false;
    }

    try {
      // Using Mailgun-style API (abstracted — swap provider as needed)
      const res = await fetch('https://api.mailgun.net/v3/ethiobankshub.com/messages', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          from: `EthioBanksHub <${this.fromAddress}>`,
          to: payload.userEmail,
          subject: payload.title,
          html: this.buildEmailHtml(payload),
          text: `${payload.title}\n\n${payload.message}`,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        this.logger.error(`Email API error: ${errBody}`);
        return false;
      }

      this.logger.log(`Email sent to ${payload.userEmail}: ${payload.title}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email: ${(error as Error).message}`);
      return false;
    }
  }

  private buildEmailHtml(payload: NotificationPayload): string {
    const severityColors: Record<string, string> = {
      info: '#3b82f6',
      warning: '#f59e0b',
      error: '#ef4444',
      success: '#22c55e',
    };
    const color = severityColors[payload.severity] ?? '#6b7280';

    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding: 20px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 12px; overflow: hidden;">
      <tr><td style="padding: 30px; background: ${color}; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 20px;">${payload.title}</h1>
      </td></tr>
      <tr><td style="padding: 24px; font-size: 14px; color: #374151; line-height: 1.6;">
        <p>${payload.message.replace(/\n/g, '<br>')}</p>
        ${payload.metadata ? `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <table cellpadding="4" cellspacing="0" style="font-size: 13px; color: #6b7280;">
            ${Object.entries(payload.metadata).map(([k, v]) => `<tr><td style="font-weight: 600;">${k}</td><td>${v}</td></tr>`).join('')}
          </table>` : ''}
      </td></tr>
      <tr><td style="padding: 16px 24px; background: #f9fafb; font-size: 12px; color: #9ca3af; text-align: center;">
        EthioBanksHub — https://ethiobankshub.com
      </td></tr>
    </table>
  </td></tr></table>
</body>
</html>`;
  }
}

// ── SMS Channel ────────────────────────────────────────────────
@Injectable()
export class SmsChannel implements NotificationChannel {
  readonly name = 'sms';
  private readonly logger = new Logger(SmsChannel.name);

  // Supported SMS providers
  private readonly provider: 'africas_talking' | 'twilio' | 'log';
  private readonly apiKey: string;
  private readonly username: string;
  private readonly fromNumber: string;
  private readonly enabled: boolean;

  constructor(configService: ConfigService) {
    this.provider = (configService.get<string>('sms.provider', 'log') as any) ?? 'log';
    this.apiKey = configService.get<string>('sms.apiKey', '');
    this.username = configService.get<string>('sms.username', '');
    this.fromNumber = configService.get<string>('sms.fromNumber', 'EthioBanks');
    this.enabled = this.provider !== 'log' && !!this.apiKey;
  }

  async send(payload: NotificationPayload): Promise<boolean> {
    if (!payload.userPhone) {
      this.logger.debug(`SMS: no recipient phone. Would send: ${payload.title}`);
      return false;
    }

    const text = `${payload.title}: ${payload.message}`.slice(0, 160); // SMS length limit

    switch (this.provider) {
      case 'africas_talking':
        return this.sendViaAfricasTalking(payload.userPhone, text);
      case 'twilio':
        return this.sendViaTwilio(payload.userPhone, text);
      case 'log':
      default:
        this.logger.log(`[SMS LOG] To: ${payload.userPhone} | ${text}`);
        return true;
    }
  }

  private async sendViaAfricasTalking(to: string, text: string): Promise<boolean> {
    try {
      const res = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          ApiKey: this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          username: this.username,
          to,
          message: text,
          from: this.fromNumber,
        }),
      });

      if (!res.ok) {
        this.logger.error(`Africa's Talking API error: ${await res.text()}`);
        return false;
      }

      this.logger.log(`SMS sent via Africa's Talking to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS via Africa's Talking: ${(error as Error).message}`);
      return false;
    }
  }

  private async sendViaTwilio(to: string, text: string): Promise<boolean> {
    try {
      const accountSid = this.username; // Twilio uses Account SID as username
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${this.apiKey}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: to,
            From: this.fromNumber,
            Body: text,
          }),
        },
      );

      if (!res.ok) {
        this.logger.error(`Twilio API error: ${await res.text()}`);
        return false;
      }

      this.logger.log(`SMS sent via Twilio to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS via Twilio: ${(error as Error).message}`);
      return false;
    }
  }
}

// ── Unified Notification Service ───────────────────────────────
@Injectable()
export class NotificationChannelService {
  private readonly logger = new Logger(NotificationChannelService.name);
  private readonly channels: Map<string, NotificationChannel> = new Map();

  constructor(
    private readonly telegramChannel: TelegramChannel,
    private readonly emailChannel: EmailChannel,
    private readonly smsChannel: SmsChannel,
  ) {
    this.register(telegramChannel);
    this.register(emailChannel);
    this.register(smsChannel);
  }

  register(channel: NotificationChannel) {
    this.channels.set(channel.name, channel);
  }

  getChannel(name: string): NotificationChannel | undefined {
    return this.channels.get(name);
  }

  async sendToAll(payload: NotificationPayload): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const [name, channel] of this.channels) {
      try {
        results[name] = await channel.send(payload);
      } catch (error) {
        this.logger.error(`Channel ${name} failed: ${(error as Error).message}`);
        results[name] = false;
      }
    }

    return results;
  }

  async sendToChannels(
    channelNames: string[],
    payload: NotificationPayload,
  ): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};

    for (const name of channelNames) {
      const channel = this.channels.get(name);
      if (!channel) {
        this.logger.warn(`Unknown notification channel: ${name}`);
        results[name] = false;
        continue;
      }
      try {
        results[name] = await channel.send(payload);
      } catch (error) {
        this.logger.error(`Channel ${name} failed: ${(error as Error).message}`);
        results[name] = false;
      }
    }

    return results;
  }
}
