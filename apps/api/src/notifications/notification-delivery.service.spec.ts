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

  it('handles non-Error provider rejections without losing delivery failure status', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NOTIFICATION_EMAIL_FROM = 'JCP <updates@example.org>';
    jest.spyOn(global, 'fetch').mockRejectedValue('network unavailable');
    const result = await service().deliver(input);
    expect(result.status).toBe('FAILED');
    expect(result.errorCode).toBe('PROVIDER_DELIVERY_FAILED');
    expect(result.errorMessage).toBe('Unknown provider error');
  });

  it('treats an unreadable successful email response as a successful delivery without an id', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NOTIFICATION_EMAIL_FROM = 'JCP <updates@example.org>';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, status: 200, json: async () => { throw new Error('invalid provider JSON'); },
    } as unknown as Response);
    const result = await service().deliver(input);
    expect(result.status).toBe('SENT');
    expect(result.providerMessageId).toBeUndefined();
  });

  it('records WhatsApp API rejection details as a failed delivery', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone-id';
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false, status: 400, json: async () => ({ error: { message: 'Invalid recipient', code: 131030 } }),
    } as Response);
    const result = await service().deliver({ ...input, channel: 'WHATSAPP', recipient: '919876543210' });
    expect(result.status).toBe('FAILED');
    expect(result.errorMessage).toContain('WhatsApp HTTP 400: Invalid recipient');
  });

  it('handles Firebase Admin becoming unavailable between readiness check and send', async () => {
    (getApps as jest.Mock)
      .mockReturnValueOnce([{ name: 'test-app' }])
      .mockReturnValueOnce([]);
    const result = await service().deliver({ ...input, channel: 'PUSH', recipient: 'fcm-token' });
    expect(result.status).toBe('FAILED');
    expect(result.errorMessage).toContain('Firebase Admin is not initialized');
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

  it('skips delivery when a verified destination is blank', async () => {
    const result = await service().deliver({
      ...input,
      recipient: '   ',
      recipientVerified: true,
      consentConfirmed: true,
    });
    expect(result.status).toBe('SKIPPED');
    expect(result.errorCode).toBe('RECIPIENT_NOT_VERIFIED_OR_CONSENT_MISSING');
    expect(global.fetch).not.toHaveBeenCalled();
    expect(firestore.recordNotificationDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SKIPPED', tenantId: 'tenant-a' }),
    );
  });

  it('retries a failed delivery with the same provider idempotency key', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NOTIFICATION_EMAIL_FROM = 'JCP <updates@example.org>';
    firestore.listNotificationDeliveries.mockResolvedValue([{
      id: deliveryId,
      status: 'FAILED',
      updatedAt: new Date(),
      errorCode: 'PROVIDER_DELIVERY_FAILED',
    }]);
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, status: 200, json: async () => ({ id: 'email-message-retry' }),
    } as Response);

    const result = await service().deliver(input);

    expect(result.status).toBe('SENT');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      headers: expect.objectContaining({ 'Idempotency-Key': 'notification-a-email' }),
    }));
    expect(firestore.recordNotificationDelivery.mock.calls.map(([record]) => record.status))
      .toEqual(['PROCESSING', 'SENT']);
    expect(firestore.recordNotificationDelivery).toHaveBeenLastCalledWith(expect.objectContaining({
      id: deliveryId,
      tenantId: 'tenant-a',
      status: 'SENT',
      providerMessageId: 'email-message-retry',
    }));
  });

  it('does not deduplicate a same-named notification across tenants', async () => {
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NOTIFICATION_EMAIL_FROM = 'JCP <updates@example.org>';
    firestore.listNotificationDeliveries.mockResolvedValue([{
      id: deliveryId,
      status: 'SENT',
      updatedAt: new Date(),
    }]);
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, status: 200, json: async () => ({ id: 'email-message-tenant-b' }),
    } as Response);
    const tenantBId = createHash('sha256')
      .update('tenant-b:notification-a:EMAIL')
      .digest('hex');

    const result = await service().deliver({ ...input, tenantId: 'tenant-b' });

    expect(result.status).toBe('SENT');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(firestore.listNotificationDeliveries).toHaveBeenCalledWith('tenant-b', 'notification-a');
    expect(firestore.recordNotificationDelivery).toHaveBeenCalledWith(expect.objectContaining({
      id: tenantBId,
      tenantId: 'tenant-b',
      status: 'PROCESSING',
    }));
  });

});
