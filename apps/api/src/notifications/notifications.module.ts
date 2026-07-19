import { Module } from '@nestjs/common';
import { NotificationChannelService, TelegramChannel, EmailChannel, SmsChannel } from './notification-channel.service';
import { NotificationsController } from './notifications.controller';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationChannelService,
    TelegramChannel,
    EmailChannel,
    SmsChannel,
  ],
  exports: [
    NotificationChannelService,
    TelegramChannel,
    EmailChannel,
    SmsChannel,
  ],
})
export class NotificationsModule {}
