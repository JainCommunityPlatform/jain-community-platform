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

  /**
   * Retry failed external sends with bounded exponential backoff. Preferences
   * and verified destinations are re-read for every attempt, so revoking
   * consent or changing account verification takes effect before a retry.
   */
  async retryFailedDeliveries(limit = 50): Promise<{ examined: number; retried: number }> {
    let candidates: Array<{
      id: string; tenantId: string; notificationId: string; userId: string;
      channel: NotificationChannel; attempts: number; updatedAt: Date;
    }>;
    try {
      candidates = await this.firestore.listFailedNotificationDeliveries(limit);
    } catch {
      this.logger.warn('Unable to load failed notification deliveries for retry');
      return { examined: 0, retried: 0 };
    }

    let retried = 0;
    const retryDelaysMs = [60_000, 300_000, 900_000, 3_600_000];
    for (const candidate of candidates) {
      if (candidate.attempts < 1 || candidate.attempts >= 5) continue;
      const delay = retryDelaysMs[candidate.attempts - 1];
      if (Date.now() - candidate.updatedAt.getTime() < delay) continue;

      try {
        const [user, preferences, notification] = await Promise.all([
          this.firestore.getUser(candidate.userId),
          this.firestore.getNotificationPreferences(candidate.tenantId, candidate.userId),
          this.firestore.getNotificationForUser(candidate.tenantId, candidate.userId, candidate.notificationId),
        ]);
        if (!user || !notification || preferences[candidate.channel.toLowerCase() as 'email' | 'whatsapp' | 'push'] !== true) {
          continue;
        }

        let recipient = '';
        let recipientVerified = false;
        if (candidate.channel === 'EMAIL') {
          recipient = user.email ?? '';
          recipientVerified = user.emailVerified === true;
        } else if (candidate.channel === 'WHATSAPP') {
          const verifiedPhone = user.verifiedPhoneNumber ?? '';
          recipient = verifiedPhone.replace(/[^0-9]/g, '');
          recipientVerified = recipient.length >= 8;
        } else {
          recipient = user.fcmToken ?? '';
          recipientVerified = Boolean(recipient.trim());
        }

        await this.delivery.deliver({
          tenantId: candidate.tenantId,
          notificationId: candidate.notificationId,
          userId: candidate.userId,
          title: notification.title,
          body: notification.body,
          channel: candidate.channel,
          recipient,
          recipientVerified,
          consentConfirmed: true,
        });
        retried += 1;
      } catch {
        this.logger.warn('Retry failed for notification delivery ' + candidate.id);
      }
    }
    return { examined: candidates.length, retried };
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
