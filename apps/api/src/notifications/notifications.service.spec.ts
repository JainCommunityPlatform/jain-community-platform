import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const firestore = {
    listNotificationsForUser: jest.fn(),
    markNotificationRead: jest.fn(),
  };
  const service = () => new NotificationsService(firestore as never);

  beforeEach(() => jest.clearAllMocks());

  it('lists only notifications for the resolved tenant and user', async () => {
    firestore.listNotificationsForUser.mockResolvedValue([{ id: 'n-1', tenantId: 'tenant-a', userId: 'user-a' }]);
    await expect(service().listForUser('tenant-a', 'user-a')).resolves.toMatchObject([{ userId: 'user-a' }]);
    expect(firestore.listNotificationsForUser).toHaveBeenCalledWith('tenant-a', 'user-a');
  });

  it('does not mark another user or tenant notification as read', async () => {
    firestore.markNotificationRead.mockResolvedValue(null);
    await expect(service().markRead('tenant-a', 'user-a', 'n-other')).rejects.toBeInstanceOf(NotFoundException);
    expect(firestore.markNotificationRead).toHaveBeenCalledWith('tenant-a', 'user-a', 'n-other');
  });
});
