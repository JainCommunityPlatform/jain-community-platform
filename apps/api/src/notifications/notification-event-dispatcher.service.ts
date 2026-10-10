import { Injectable, Logger } from '@nestjs/common';
import { FirestoreService } from '../database/firestore.service';
import { NotificationDeliveryService, NotificationChannel } from './notification-delivery.service';

@Injectable()
export class NotificationEventDispatcher {
  private readonly logger = new Logger(NotificationEventDispatcher.name);

  constructor(
    private readonly firestore: FirestoreService,
    private readonly delivery: NotificationDeliveryService,
  ) {}

  /**
   * Dispatch an already-persisted in-app event to channels the member explicitly
   * enabled. This runs after the financial transaction has committed and must
   * never be allowed to fail the calling financial workflow.
   */
  async dispatchForEntity(input: {
    tenantId: string;
    userId: string;
    entityType: string;
    entityId: string;
  }): Promise<void> {
    try {
      const [user, preferences, notifications] = await Promise.all([
        this.firestore.getUser(input.userId),
        this.firestore.getNotificationPreferences(input.tenantId, input.userId),
        this.firestore.listNotificationsForUser(input.tenantId, input.userId, 100),
      ]);

      if (!user) return;
      const notification = notifications.find(
        (item) => item.entityType === input.entityType && item.entityId === input.entityId,
      );
      if (!notification) return;

      const tasks: Array<Promise<unknown>> = [];
      if (preferences.email) {
        tasks.push(this.deliverChannel({
          tenantId: input.tenantId,
          userId: input.userId,
          notification,
          channel: 'EMAIL',
          recipient: user.email ?? '',
          recipientVerified: user.emailVerified === true,
        }));
      }

      if (preferences.whatsapp) {
        const verifiedPhone = user.verifiedPhoneNumber ?? '';
        tasks.push(this.deliverChannel({
          tenantId: input.tenantId,
          userId: input.userId,
          notification,
          channel: 'WHATSAPP',
          recipient: verifiedPhone.replace(/[^0-9]/g, ''),
          recipientVerified: verifiedPhone.replace(/[^0-9]/g, '').length >= 8,
        }));
      }

      if (preferences.push) {
        tasks.push(this.deliverChannel({
          tenantId: input.tenantId,
          userId: input.userId,
          notification,
          channel: 'PUSH',
          recipient: user.fcmToken ?? '',
          recipientVerified: Boolean(user.fcmToken?.trim()),
        }));
      }

      await Promise.all(tasks);
    } catch {
      // Notification delivery is best-effort and cannot roll back a pledge,
      // payment, receipt, or finance decision that has already committed.
      this.logger.warn(
        'Notification event dispatch failed for entity ' + input.entityType + ':' + input.entityId,
      );
    }
  }

  private deliverChannel(input: {
    tenantId: string;
    userId: string;
    notification: {
      id: string;
      title: string;
      body: string;
    };
    channel: NotificationChannel;
    recipient: string;
    recipientVerified: boolean;
  }) {
    return this.delivery.deliver({
      tenantId: input.tenantId,
      notificationId: input.notification.id,
      userId: input.userId,
      title: input.notification.title,
      body: input.notification.body,
      channel: input.channel,
      recipient: input.recipient,
      recipientVerified: input.recipientVerified,
      consentConfirmed: true,
    });
  }
}
