import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    const notifications = await this.prisma.userNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { data: notifications, total: notifications.length };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.userNotification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(userId: string, id: string) {
    await this.prisma.userNotification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.userNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return result.count;
  }

  async create(
    userId: string,
    data: {
      type: string;
      title: string;
      message: string;
      severity?: string;
      link?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.prisma.userNotification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        severity: data.severity ?? 'info',
        link: data.link,
        metadata: data.metadata ?? {},
      },
    });
  }
}
