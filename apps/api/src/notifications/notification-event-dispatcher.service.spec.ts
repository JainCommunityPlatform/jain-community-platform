import { NotificationEventDispatcher } from './notification-event-dispatcher.service';

describe('NotificationEventDispatcher', () => {
  const firestore = {
    getUser: jest.fn(),
    getNotificationPreferences: jest.fn(),
    listNotificationsForUser: jest.fn(),
  };
  const delivery = { deliver: jest.fn().mockResolvedValue({ status: 'SENT' }) };
  const dispatcher = () => new NotificationEventDispatcher(firestore as never, delivery as never);
  const notification = {
    id: 'notification-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    entityType: 'DonationPledge',
    entityId: 'pledge-1',
    title: 'Pledge recorded',
    body: 'Thank you',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    firestore.getUser.mockResolvedValue({
      id: 'user-1',
      email: 'donor@example.com',
      emailVerified: true,
      verifiedPhoneNumber: '+919876543210',
      fcmToken: 'fcm-token',
    });
    firestore.getNotificationPreferences.mockResolvedValue({ email: false, whatsapp: false, push: false });
    firestore.listNotificationsForUser.mockResolvedValue([notification]);
    delivery.deliver.mockResolvedValue({ status: 'SENT' });
  });

  it('does not deliver to channels that the member has not enabled', async () => {
    await dispatcher().dispatchForEntity({
      tenantId: 'tenant-1', userId: 'user-1', entityType: 'DonationPledge', entityId: 'pledge-1',
    });
    expect(delivery.deliver).not.toHaveBeenCalled();
  });

  it('delivers only to enabled channels and passes verified destinations', async () => {
    firestore.getNotificationPreferences.mockResolvedValue({ email: true, whatsapp: true, push: false });
    await dispatcher().dispatchForEntity({
      tenantId: 'tenant-1', userId: 'user-1', entityType: 'DonationPledge', entityId: 'pledge-1',
    });
    expect(delivery.deliver).toHaveBeenCalledTimes(2);
    expect(delivery.deliver).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'EMAIL', recipient: 'donor@example.com', recipientVerified: true, consentConfirmed: true,
    }));
    expect(delivery.deliver).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'WHATSAPP', recipient: '919876543210', recipientVerified: true, consentConfirmed: true,
    }));
  });

  it('never treats an unverified email as verified', async () => {
    firestore.getUser.mockResolvedValue({ id: 'user-1', email: 'donor@example.com', emailVerified: false });
    firestore.getNotificationPreferences.mockResolvedValue({ email: true, whatsapp: false, push: false });
    await dispatcher().dispatchForEntity({
      tenantId: 'tenant-1', userId: 'user-1', entityType: 'DonationPledge', entityId: 'pledge-1',
    });
    expect(delivery.deliver).toHaveBeenCalledWith(expect.objectContaining({
      channel: 'EMAIL', recipientVerified: false, consentConfirmed: true,
    }));
  });

  it('ignores notifications outside the requested tenant user event', async () => {
    firestore.listNotificationsForUser.mockResolvedValue([]);
    firestore.getNotificationPreferences.mockResolvedValue({ email: true, whatsapp: true, push: true });
    await dispatcher().dispatchForEntity({
      tenantId: 'tenant-1', userId: 'user-1', entityType: 'DonationPledge', entityId: 'other-pledge',
    });
    expect(delivery.deliver).not.toHaveBeenCalled();
  });

  it('swallows unexpected persistence errors so event dispatch is non-blocking', async () => {
    firestore.getUser.mockRejectedValue(new Error('Firestore unavailable'));
    await expect(dispatcher().dispatchForEntity({
      tenantId: 'tenant-1', userId: 'user-1', entityType: 'DonationPledge', entityId: 'pledge-1',
    })).resolves.toBeUndefined();
  });
});
