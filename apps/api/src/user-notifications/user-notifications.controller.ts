import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserNotificationsService } from './user-notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/request-with-user.interface';

@ApiTags('User Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-notifications')
export class UserNotificationsController {
  constructor(private readonly service: UserNotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  async findAll(@CurrentUser() payload: JwtPayload) {
    return this.service.findAll(payload.sub);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser() payload: JwtPayload) {
    return this.service.getUnreadCount(payload.sub);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@CurrentUser() payload: JwtPayload, @Param('id') id: string) {
    await this.service.markAsRead(payload.sub, id);
    return { message: 'Marked as read' };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() payload: JwtPayload) {
    const count = await this.service.markAllAsRead(payload.sub);
    return { message: `${count} notifications marked as read` };
  }
}
