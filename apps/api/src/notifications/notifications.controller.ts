import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationChannelService } from './notification-channel.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/request-with-user.interface';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationService: NotificationChannelService) {}

  @Get('channels')
  @ApiOperation({ summary: 'List available notification channels' })
  getChannels() {
    return {
      data: [
        { id: 'telegram', name: 'Telegram', enabled: true },
        { id: 'email', name: 'Email', enabled: true },
        { id: 'sms', name: 'SMS', enabled: true },
      ],
    };
  }

  @Post('test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a test notification to all channels' })
  async sendTest(
    @CurrentUser() payload: JwtPayload,
    @Body() body: { channels?: string[] },
  ) {
    const results = await this.notificationService.sendToChannels(
      body.channels ?? ['telegram', 'email', 'sms'],
      {
        userId: payload.sub,
        userEmail: payload.email,
        title: '🔔 EthioBanksHub Test Notification',
        message: 'This is a test notification from EthioBanksHub. If you received this, your notification channel is working correctly!',
        severity: 'info',
        metadata: {
          Time: new Date().toISOString(),
          Environment: process.env['NODE_ENV'] ?? 'development',
        },
      },
    );

    return { success: true, data: results };
  }
}
