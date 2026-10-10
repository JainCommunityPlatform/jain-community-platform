import { TenantMembershipController } from './tenant-membership.controller';

describe('TenantMembershipController', () => {
  const tenant = { get: jest.fn().mockReturnValue({ id: 'tenant-a' }) };
  const context = {
    get: jest.fn().mockReturnValue({ userId: 'actor-a', tenantId: 'tenant-a' }),
  };
  const firestore = { recordAudit: jest.fn().mockResolvedValue(undefined) };
  const memberships = {
    listTenantMemberships: jest.fn().mockResolvedValue([
      {
        id: 'user-a__tenant-a',
        userId: 'user-a',
        tenantId: 'tenant-a',
        role: 'FINANCE_VIEWER',
        roles: ['FINANCE_VIEWER', 'INVENTORY_MANAGER'],
        user: { email: 'member@example.test', displayName: 'Member', primaryPhone: null },
      },
    ]),
    assignRolesByEmail: jest.fn().mockResolvedValue({
      id: 'user-a__tenant-a',
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'FINANCE_VIEWER',
      roles: ['FINANCE_VIEWER', 'INVENTORY_MANAGER'],
    }),
    assignRoles: jest.fn().mockResolvedValue({
      id: 'user-a__tenant-a',
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'FINANCE_VIEWER',
      roles: ['FINANCE_VIEWER', 'INVENTORY_MANAGER'],
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tenant.get.mockReturnValue({ id: 'tenant-a' });
    context.get.mockReturnValue({ userId: 'actor-a', tenantId: 'tenant-a' });
  });

  it('lists team members without exposing phone details', async () => {
    const controller = new TenantMembershipController(
      memberships as never,
      tenant as never,
      context as never,
      firestore as never,
    );

    await expect(controller.listMemberships()).resolves.toEqual([
      {
        userId: 'user-a',
        email: 'member@example.test',
        displayName: 'Member',
        role: 'FINANCE_VIEWER',
        roles: ['FINANCE_VIEWER', 'INVENTORY_MANAGER'],
      },
    ]);
  });

  it('assigns multiple roles by email and writes an audit record', async () => {
    const controller = new TenantMembershipController(
      memberships as never,
      tenant as never,
      context as never,
      firestore as never,
    );

    await expect(controller.assignRolesByEmail({
      email: 'member@example.test',
      roles: ['FINANCE_VIEWER', 'INVENTORY_MANAGER'],
    })).resolves.toMatchObject({
      userId: 'user-a',
      roles: ['FINANCE_VIEWER', 'INVENTORY_MANAGER'],
    });

    expect(memberships.assignRolesByEmail).toHaveBeenCalledWith(
      'member@example.test',
      'tenant-a',
      ['FINANCE_VIEWER', 'INVENTORY_MANAGER'],
    );
    expect(firestore.recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'TENANT_MEMBERSHIP_ROLES_UPDATED',
      tenantId: 'tenant-a',
      userId: 'actor-a',
    }));
  });

  it('updates an existing member role set by user ID', async () => {
    const controller = new TenantMembershipController(
      memberships as never,
      tenant as never,
      context as never,
      firestore as never,
    );

    await expect(controller.updateRoles('user-a', {
      roles: ['FINANCE_VIEWER', 'INVENTORY_MANAGER'],
    })).resolves.toMatchObject({
      userId: 'user-a',
      roles: ['FINANCE_VIEWER', 'INVENTORY_MANAGER'],
    });
    expect(memberships.assignRoles).toHaveBeenCalledWith(
      'user-a',
      'tenant-a',
      ['FINANCE_VIEWER', 'INVENTORY_MANAGER'],
    );
  });
});
