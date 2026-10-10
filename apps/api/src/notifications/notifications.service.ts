import { Injectable, NotFoundException } from '@nestjs/common';
import { FirestoreService } from '../database/firestore.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly firestore: FirestoreService) {}

  listForUser(tenantId: string, userId: string) {
    return this.firestore.listNotificationsForUser(tenantId, userId);
  }

  async markRead(tenantId: string, userId: string, notificationId: string) {
    const notification = await this.firestore.markNotificationRead(tenantId, userId, notificationId);
    if (!notification) throw new NotFoundException('Notification not found for this user and tenant');
    return notification;
  }
}
