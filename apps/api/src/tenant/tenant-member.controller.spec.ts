import { TenantMemberController } from './tenant-member.controller';

describe('TenantMemberController', () => {
  const members = {
    list: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const controller = new TenantMemberController(members as never);

  beforeEach(() => jest.clearAllMocks());

  it('lists tenant members', async () => {
    members.list.mockResolvedValue([{ userId: 'user-1' }]);
    await expect(controller.list()).resolves.toEqual([{ userId: 'user-1' }]);
    expect(members.list).toHaveBeenCalledTimes(1);
  });

  it('gets a tenant member by user ID', async () => {
    members.get.mockResolvedValue({ userId: 'user-1' });
    await expect(controller.get('user-1')).resolves.toEqual({ userId: 'user-1' });
    expect(members.get).toHaveBeenCalledWith('user-1');
  });

  it('creates a tenant member using validated role input', async () => {
    members.create.mockResolvedValue({ userId: 'user-1', role: 'FINANCE_VIEWER' });
    await expect(controller.create({
      userId: 'user-1',
      role: 'FINANCE_VIEWER',
    })).resolves.toMatchObject({ role: 'FINANCE_VIEWER' });
    expect(members.create).toHaveBeenCalledWith('user-1', 'FINANCE_VIEWER');
  });

  it('updates a tenant member role', async () => {
    members.update.mockResolvedValue({ userId: 'user-1', role: 'INVENTORY_MANAGER' });
    await expect(controller.update('user-1', {
      role: 'INVENTORY_MANAGER',
    })).resolves.toMatchObject({ role: 'INVENTORY_MANAGER' });
    expect(members.update).toHaveBeenCalledWith('user-1', 'INVENTORY_MANAGER');
  });

  it('removes a tenant member', async () => {
    members.remove.mockResolvedValue(undefined);
    await expect(controller.remove('user-1')).resolves.toBeUndefined();
    expect(members.remove).toHaveBeenCalledWith('user-1');
  });
});
