import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { FirestoreService } from '../database/firestore.service';

export type NotificationChannel = 'EMAIL' | 'WHATSAPP' | 'PUSH';
export type DeliveryStatus = 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED' | 'SKIPPED';

export interface ExternalNotificationInput {
  tenantId: string;
  notificationId: string;
  userId: string;
  title: string;
  body: string;
  channel: NotificationChannel;
  recipient: string;
  recipientVerified: boolean;
  consentConfirmed: boolean;
}

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(private readonly firestore: FirestoreService) {}

  providerReadiness() {
    return {
      email: Boolean(process.env.RESEND_API_KEY && process.env.NOTIFICATION_EMAIL_FROM),
      whatsapp: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
      push: getApps().length > 0,
    };
  }

  async deliver(input: ExternalNotificationInput) {
    const id = createHash('sha256')
      .update(input.tenantId + ':' + input.notificationId + ':' + input.channel)
      .digest('hex');
    const existing = (await this.firestore.listNotificationDeliveries(input.tenantId, input.notificationId))
      .find((delivery) => delivery.id === id);

    if (existing?.status === 'SENT') return existing;
    if (existing?.status === 'PROCESSING' && Date.now() - existing.updatedAt.getTime() < 15 * 60 * 1000) {
      return existing;
    }

    if (!input.recipientVerified || !input.consentConfirmed || !input.recipient.trim()) {
      return this.firestore.recordNotificationDelivery({
        id, tenantId: input.tenantId, notificationId: input.notificationId,
        userId: input.userId, channel: input.channel, status: 'SKIPPED',
        errorCode: 'RECIPIENT_NOT_VERIFIED_OR_CONSENT_MISSING',
        errorMessage: 'A verified destination and channel consent are required.',
      });
    }

    if (!this.isConfigured(input.channel)) {
      return this.firestore.recordNotificationDelivery({
        id, tenantId: input.tenantId, notificationId: input.notificationId,
        userId: input.userId, channel: input.channel, status: 'SKIPPED',
        errorCode: 'PROVIDER_NOT_CONFIGURED',
        errorMessage: 'The provider for this channel is not configured.',
      });
    }

    await this.firestore.recordNotificationDelivery({
      id, tenantId: input.tenantId, notificationId: input.notificationId,
      userId: input.userId, channel: input.channel, status: 'PROCESSING',
    });

    try {
      const providerMessageId = await this.send(input);
      return await this.firestore.recordNotificationDelivery({
        id, tenantId: input.tenantId, notificationId: input.notificationId,
        userId: input.userId, channel: input.channel, status: 'SENT', providerMessageId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown provider error';
      this.logger.warn('External notification delivery failed for channel ' + input.channel);
      return this.firestore.recordNotificationDelivery({
        id, tenantId: input.tenantId, notificationId: input.notificationId,
        userId: input.userId, channel: input.channel, status: 'FAILED',
        errorCode: 'PROVIDER_DELIVERY_FAILED',
        errorMessage: message.slice(0, 300),
      });
    }
  }

  private isConfigured(channel: NotificationChannel) {
    const ready = this.providerReadiness();
    if (channel === 'EMAIL') return ready.email;
    if (channel === 'WHATSAPP') return ready.whatsapp;
    return ready.push;
  }

  private async send(input: ExternalNotificationInput): Promise<string | undefined> {
    if (input.channel === 'EMAIL') {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
          'Content-Type': 'application/json',
          'Idempotency-Key': input.notificationId + '-email',
        },
        body: JSON.stringify({
          from: process.env.NOTIFICATION_EMAIL_FROM,
          to: [input.recipient],
          subject: input.title,
          text: input.body,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { id?: string; message?: string };
      if (!response.ok) throw new Error('Resend HTTP ' + response.status + ': ' + (payload.message ?? 'request rejected'));
      return payload.id;
    }

    if (input.channel === 'WHATSAPP') {
      const version = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || 'v22.0';
      const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const response = await fetch('https://graph.facebook.com/' + version + '/' + phoneNumberId + '/messages', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + process.env.WHATSAPP_ACCESS_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: input.recipient,
          type: 'text',
          text: { preview_url: false, body: input.title + '\n\n' + input.body },
        }),
      });
      const payload = await response.json().catch(() => ({})) as {
        messages?: Array<{ id?: string }>;
        error?: { message?: string; code?: number };
      };
      if (!response.ok) throw new Error('WhatsApp HTTP ' + response.status + ': ' + (payload.error?.message ?? 'request rejected'));
      return payload.messages?.[0]?.id;
    }

    const app = getApps()[0];
    if (!app) throw new Error('Firebase Admin is not initialized for push delivery');
    return getMessaging(app).send({
      token: input.recipient,
      notification: { title: input.title, body: input.body },
      data: { tenantId: input.tenantId, notificationId: input.notificationId },
    });
  }
}
