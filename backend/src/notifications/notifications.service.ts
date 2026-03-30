import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getUnread(user: JwtPayload) {
    return await this.prisma.notification.findMany({
      where: { userId: user.sub, readAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        transferId: true,
        fromShopId: true,
        toShopId: true,
        createdAt: true,
        readAt: true,
      },
    });
  }

  async markRead(user: JwtPayload, notificationId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId: user.sub },
      select: { id: true, readAt: true },
    });
    if (!existing) throw new NotFoundException('Notification not found');

    if (existing.readAt) return existing;

    return await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
      select: {
        id: true,
        readAt: true,
      },
    });
  }
}
