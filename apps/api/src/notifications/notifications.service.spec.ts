import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const firestore = {
    listNotificationsForUser: jest.fn(),
    markNotificationRead: jest.fn(),
    getNotificationPreferences: jest.fn(),
    updateNotificationPreferences: jest.fn(),
  };
  const service = () => new NotificationsService(firestore as never);

  beforeEach(() => jest.clearAllMocks());

  it('returns channel preferences defaulted to opt-out', async () => {
    firestore.getNotificationPreferences.mockResolvedValue({ tenantId: 'tenant-a', userId: 'user-a', email: false, whatsapp: false, push: false });
    await expect(service().getPreferences('tenant-a', 'user-a')).resolves.toMatchObject({ email: false, whatsapp: false, push: false });
    expect(firestore.getNotificationPreferences).toHaveBeenCalledWith('tenant-a', 'user-a');
  });

  it('updates preferences only for the specified tenant and user', async () => {
    const input = { tenantId: 'tenant-a', userId: 'user-a', email: true, whatsapp: false, push: true };
    firestore.updateNotificationPreferences.mockResolvedValue(input);
    await expect(service().updatePreferences(input)).resolves.toMatchObject(input);
    expect(firestore.updateNotificationPreferences).toHaveBeenCalledWith(input);
  });

  it('lists only notifications for the resolved tenant and user', async () => {
    firestore.listNotificationsForUser.mockResolvedValue([{ id: 'n-1', tenantId: 'tenant-a', userId: 'user-a' }]);
    await expect(service().listForUser('tenant-a', 'user-a')).resolves.toMatchObject([{ userId: 'user-a' }]);
    expect(firestore.listNotificationsForUser).toHaveBeenCalledWith('tenant-a', 'user-a');
  });

  it('returns the notification after marking it read', async () => {
    firestore.markNotificationRead.mockResolvedValue({ id: 'n-1', tenantId: 'tenant-a', userId: 'user-a', readAt: new Date() });
    await expect(service().markRead('tenant-a', 'user-a', 'n-1')).resolves.toMatchObject({ id: 'n-1' });
  });

  it('does not mark another user or tenant notification as read', async () => {
    firestore.markNotificationRead.mockResolvedValue(null);
    await expect(service().markRead('tenant-a', 'user-a', 'n-other')).rejects.toBeInstanceOf(NotFoundException);
    expect(firestore.markNotificationRead).toHaveBeenCalledWith('tenant-a', 'user-a', 'n-other');
  });
});
