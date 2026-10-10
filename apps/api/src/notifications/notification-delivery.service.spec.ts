import { createHash } from 'node:crypto';
import { getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { NotificationDeliveryService } from './notification-delivery.service';

jest.mock('firebase-admin/app', () => ({ getApps: jest.fn(() => []) }));
jest.mock('firebase-admin/messaging', () => ({ getMessaging: jest.fn() }));

describe('NotificationDeliveryService', () => {
  const firestore = {
    listNotificationDeliveries: jest.fn(),
    recordNotificationDelivery: jest.fn(),
  };
  const service = () => new NotificationDeliveryService(firestore as never);
  const input = {
    tenantId: 'tenant-a',
    notificationId: 'notification-a',
    userId: 'user-a',
    title: 'Pledge recorded',
    body: 'Thank you',
    channel: 'EMAIL' as const,
    recipient: 'donor@example.com',
    recipientVerified: true,
    consentConfirmed: true,
  };
  const deliveryId = createHash('sha256')
    .update('tenant-a:notification-a:EMAIL')
    .digest('hex');

  beforeEach(() => {
    jest.clearAllMocks();
    (getApps as jest.Mock).mockReturnValue([]);
    delete process.env.RESEND_API_KEY;
    delete process.env.NOTIFICATION_EMAIL_FROM;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    firestore.listNotificationDeliveries.mockResolvedValue([]);
    firestore.recordNotificationDelivery.mockImplementation(async (value) => ({
      ...value, attempts: value.status === 'FAILED' || value.status === 'SENT' ? 1 : 0,
      createdAt: new Date(), updatedAt: new Date(),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not send to an unverified destination or without consent', async () => {
    const result = await service().deliver({ ...input, recipientVerified: false });
    expect(result.status).toBe('SKIPPED');
    expect(result.errorCode).toBe('RECIPIENT_NOT_VERIFIED_OR_CONSENT_MISSING');
    expect(firestore.recordNotificationDelivery).toHaveBeenCalledWith(expect.objectContaining({ status: 'SKIPPED' }));
  });

  it('records a skipped delivery when the provider is not configured', async () => {
    const result = await service().deliver(input);
    expect(result.status).toBe('SKIPPED');
    expect(result.errorCode).toBe('PROVIDER_NOT_CONFIGURED');
  });

  it('does not send a notification already marked as sent', async () => {
    const existing = { id: deliveryId, status: 'SENT', updatedAt: new Date() };
    firestore.listNotificationDeliveries.mockResolvedValue([existing]);
    await expect(service().deliver(input)).resolves.toBe(existing);
    expect(firestore.recordNotificationDelivery).not.toHaveBeenCalled();
  });

  it('returns an active processing record rather than concurrently resending it', async () => {
    const existing = { id: deliveryId, status: 'PROCESSING', updatedAt: new Date() };
    firestore.listNotificationDeliveries.mockResolvedValue([existing]);
    await expect(service().deliver(input)).resolves.toBe(existing);
    expect(firestore.recordNotificationDelivery).not.toHaveBeenCalled();
  });

  it('sends email through Resend and persists the provider message id', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NOTIFICATION_EMAIL_FROM = 'JCP <updates@example.org>';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, status: 200, json: async () => ({ id: 'email-message-1' }),
    } as Response);
    const result = await service().deliver(input);
    expect(result.status).toBe('SENT');
    expect(firestore.recordNotificationDelivery).toHaveBeenLastCalledWith(expect.objectContaining({
      id: deliveryId, status: 'SENT', providerMessageId: 'email-message-1',
    }));
    expect(global.fetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      headers: expect.objectContaining({ 'Idempotency-Key': 'notification-a-email' }),
    }));
  });

  it('records provider errors without throwing into the financial workflow', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NOTIFICATION_EMAIL_FROM = 'JCP <updates@example.org>';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false, status: 503, json: async () => ({ message: 'provider unavailable' }),
    } as Response);
    const result = await service().deliver(input);
    expect(result.status).toBe('FAILED');
    expect(result.errorCode).toBe('PROVIDER_DELIVERY_FAILED');
    expect(result.errorMessage).toContain('Resend HTTP 503');
  });

  it('sends WhatsApp messages using the configured Cloud API phone number', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.1' }] }),
    } as Response);
    const result = await service().deliver({ ...input, channel: 'WHATSAPP', recipient: '919876543210' });
    expect(result.status).toBe('SENT');
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/phone-id/messages'), expect.any(Object));
  });

  it('records a failed push attempt when Firebase rejects the message', async () => {
    (getApps as jest.Mock).mockReturnValue([{ name: 'test-app' }]);
    (getMessaging as jest.Mock).mockReturnValue({
      send: jest.fn().mockRejectedValue(new Error('Firebase push rejected')),
    });
    const result = await service().deliver({ ...input, channel: 'PUSH', recipient: 'fcm-token' });
    expect(result.status).toBe('FAILED');
    expect(result.errorMessage).toContain('Firebase push rejected');
  });

  it('allows retrying a stale processing record', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NOTIFICATION_EMAIL_FROM = 'JCP <updates@example.org>';
    firestore.listNotificationDeliveries.mockResolvedValue([{
      id: deliveryId, status: 'PROCESSING', updatedAt: new Date(Date.now() - 16 * 60 * 1000),
    }]);
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, status: 200, json: async () => ({ id: 'email-message-2' }),
    } as Response);
    const result = await service().deliver(input);
    expect(result.status).toBe('SENT');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
