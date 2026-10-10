import { NotificationDeliveryService } from './notification-delivery.service';

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

  beforeEach(() => {
    jest.clearAllMocks();
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
    const existing = { id: 'delivery-id', status: 'SENT', updatedAt: new Date() };
    firestore.listNotificationDeliveries.mockResolvedValue([existing]);
    await expect(service().deliver(input)).resolves.toBe(existing);
    expect(firestore.recordNotificationDelivery).not.toHaveBeenCalled();
  });

  it('returns an active processing record rather than concurrently resending it', async () => {
    const existing = { id: 'delivery-id', status: 'PROCESSING', updatedAt: new Date() };
    firestore.listNotificationDeliveries.mockResolvedValue([existing]);
    await expect(service().deliver(input)).resolves.toBe(existing);
    expect(firestore.recordNotificationDelivery).not.toHaveBeenCalled();
  });
});
