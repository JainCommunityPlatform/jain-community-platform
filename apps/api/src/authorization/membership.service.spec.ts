import { MembershipService } from './membership.service';

describe('MembershipService', () => {
  it('returns the membership for the authenticated user and tenant', async () => {
    const getMembership = jest.fn().mockResolvedValue({
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'CONTENT_MANAGER',
    });
    const firestore = { getMembership };

    const service = new MembershipService(firestore as never);

    await expect(service.resolve('user-a', 'tenant-a')).resolves.toEqual({
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'CONTENT_MANAGER',
      roles: ['CONTENT_MANAGER'],
    });

    expect(getMembership).toHaveBeenCalledWith('user-a', 'tenant-a');
  });

  it('resolves multiple supported roles and ignores unknown roles', async () => {
    const service = new MembershipService({
      getMembership: jest.fn().mockResolvedValue({
        userId: 'user-a',
        tenantId: 'tenant-a',
        role: 'FINANCE_VIEWER',
        roles: ['FINANCE_VIEWER', 'INVENTORY_MANAGER', 'UNKNOWN_ROLE'],
      }),
    } as never);

    await expect(service.resolve('user-a', 'tenant-a')).resolves.toEqual({
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'FINANCE_VIEWER',
      roles: ['FINANCE_VIEWER', 'INVENTORY_MANAGER'],
    });
  });

  it('assigns multiple roles to an existing user membership', async () => {
    const updateMembershipRoles = jest.fn().mockResolvedValue({
      id: 'user-a__tenant-a',
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'FINANCE_VIEWER',
      roles: ['FINANCE_VIEWER', 'INVENTORY_MANAGER'],
    });
    const service = new MembershipService({
      getUser: jest.fn().mockResolvedValue({ id: 'user-a' }),
      getMembership: jest.fn().mockResolvedValue({
        id: 'user-a__tenant-a',
        userId: 'user-a',
        tenantId: 'tenant-a',
        role: 'FINANCE_VIEWER',
        roles: ['FINANCE_VIEWER'],
      }),
      updateMembershipRoles,
    } as never);

    await expect(service.assignRoles(
      'user-a',
      'tenant-a',
      ['FINANCE_VIEWER', 'INVENTORY_MANAGER'],
    )).resolves.toMatchObject({
      roles: ['FINANCE_VIEWER', 'INVENTORY_MANAGER'],
    });
    expect(updateMembershipRoles).toHaveBeenCalledWith(
      'user-a',
      'tenant-a',
      ['FINANCE_VIEWER', 'INVENTORY_MANAGER'],
    );
  });

  it('returns null when no membership exists', async () => {
    const getMembership = jest.fn().mockResolvedValue(null);
    const service = new MembershipService({ getMembership } as never);

    await expect(service.resolve('user-a', 'tenant-a')).resolves.toBeNull();
  });

  it('returns null for an unsupported persisted role', async () => {
    const getMembership = jest.fn().mockResolvedValue({
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'SUPER_USER',
    });
    const service = new MembershipService({ getMembership } as never);

    await expect(service.resolve('user-a', 'tenant-a')).resolves.toBeNull();
  });
});
