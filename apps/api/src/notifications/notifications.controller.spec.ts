import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';

describe('NotificationsController', () => {
  const notifications = {
    listForUser: jest.fn(),
    markRead: jest.fn(),
  };
  const tenantContext = { get: jest.fn() };
  const auth = { get: jest.fn() };
  const identity = { resolve: jest.fn() };

  const controller = () => new NotificationsController(
    notifications as never,
    tenantContext as never,
    auth as never,
    identity as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    tenantContext.get.mockReturnValue({ id: 'tenant-a' });
    auth.get.mockReturnValue({ uid: 'auth-user' });
    identity.resolve.mockResolvedValue({ id: 'user-a' });
  });

  it('lists notifications for the authenticated user in the current tenant', async () => {
    notifications.listForUser.mockResolvedValue([{ id: 'n-1', tenantId: 'tenant-a', userId: 'user-a' }]);
    await expect(controller().listMine()).resolves.toMatchObject([{ userId: 'user-a' }]);
    expect(notifications.listForUser).toHaveBeenCalledWith('tenant-a', 'user-a');
  });

  it('marks only the authenticated user notification as read', async () => {
    notifications.markRead.mockResolvedValue({ id: 'n-1', readAt: new Date() });
    await expect(controller().markMineRead('n-1')).resolves.toMatchObject({ id: 'n-1' });
    expect(notifications.markRead).toHaveBeenCalledWith('tenant-a', 'user-a', 'n-1');
  });

  it('requires tenant context before listing or changing notifications', async () => {
    tenantContext.get.mockReturnValue(null);
    await expect(controller().listMine()).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller().markMineRead('n-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(notifications.listForUser).not.toHaveBeenCalled();
    expect(notifications.markRead).not.toHaveBeenCalled();
  });

  it('requires a resolved authenticated identity', async () => {
    identity.resolve.mockResolvedValue(null);
    await expect(controller().listMine()).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(controller().markMineRead('n-1')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
