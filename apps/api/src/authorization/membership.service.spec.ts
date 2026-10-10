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

  it('preserves the primary role when legacy role arrays are inconsistent', async () => {
    const service = new MembershipService({
      getMembership: jest.fn().mockResolvedValue({
        userId: 'user-a', tenantId: 'tenant-a', role: 'TENANT_ADMIN',
        roles: ['FINANCE_VIEWER'],
      }),
    } as never);

    await expect(service.resolve('user-a', 'tenant-a')).resolves.toEqual({
      userId: 'user-a', tenantId: 'tenant-a', role: 'TENANT_ADMIN',
      roles: ['TENANT_ADMIN', 'FINANCE_VIEWER'],
    });
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

  it('prevents removing the final tenant administrator', async () => {
    const service = new MembershipService({
      getUser: jest.fn().mockResolvedValue({ id: 'user-a' }),
      getMembership: jest.fn().mockResolvedValue({
        id: 'user-a__tenant-a',
        userId: 'user-a',
        tenantId: 'tenant-a',
        role: 'TENANT_ADMIN',
        roles: ['TENANT_ADMIN', 'FINANCE_VIEWER'],
      }),
      listMemberships: jest.fn().mockResolvedValue([
        { userId: 'user-a', roles: ['TENANT_ADMIN', 'FINANCE_VIEWER'] },
      ]),
      updateMembershipRoles: jest.fn(),
    } as never);

    await expect(service.assignRoles(
      'user-a',
      'tenant-a',
      ['FINANCE_VIEWER'],
    )).rejects.toThrow('At least one temple administrator must remain assigned');
  });

  it('grants a financial role without overwriting an existing general role', async () => {
    const assignRoles = jest.fn().mockResolvedValue({ userId: 'user-b', tenantId: 'tenant-a', role: 'CONTENT_MANAGER', roles: ['CONTENT_MANAGER', 'FINANCE_VIEWER'] });
    const service = new MembershipService({
      findUserByEmail: jest.fn().mockResolvedValue({ id: 'user-b', platformRoles: [] }),
      getUser: jest.fn().mockResolvedValue({ id: 'user-b', platformRoles: [] }),
      getMembership: jest.fn().mockResolvedValue({ userId: 'user-b', tenantId: 'tenant-a', role: 'CONTENT_MANAGER', roles: ['CONTENT_MANAGER'] }),
      updateMembershipRoles: assignRoles,
    } as never);
    await expect(service.grantFinancialRoleByEmail('member@example.test', 'tenant-a', 'FINANCE_VIEWER', 'platform-user')).resolves.toMatchObject({ roles: ['CONTENT_MANAGER', 'FINANCE_VIEWER'] });
  });

  it('rejects finance-role grants to tenant administrators', async () => {
    const service = new MembershipService({
      findUserByEmail: jest.fn().mockResolvedValue({ id: 'user-b', platformRoles: [] }),
      getUser: jest.fn().mockResolvedValue({ id: 'user-b', platformRoles: [] }),
      getMembership: jest.fn().mockResolvedValue({ userId: 'user-b', tenantId: 'tenant-a', role: 'TENANT_ADMIN', roles: ['TENANT_ADMIN'] }),
    } as never);
    await expect(service.grantFinancialRoleByEmail('member@example.test', 'tenant-a', 'FINANCE_VIEWER', 'platform-user')).rejects.toThrow('Tenant administrators cannot be assigned financial roles');
  });

  it('rejects finance-role grants to platform administrators and self-grants', async () => {
    const platformTarget = new MembershipService({
      findUserByEmail: jest.fn().mockResolvedValue({ id: 'target', platformRoles: ['PLATFORM_ADMIN'] }),
    } as never);
    await expect(platformTarget.grantFinancialRoleByEmail('admin@example.test', 'tenant-a', 'FINANCE_VIEWER', 'actor')).rejects.toThrow('Platform administrators cannot be assigned tenant financial roles');
    const selfTarget = new MembershipService({
      findUserByEmail: jest.fn().mockResolvedValue({ id: 'actor', platformRoles: [] }),
    } as never);
    await expect(selfTarget.grantFinancialRoleByEmail('actor@example.test', 'tenant-a', 'FINANCE_VIEWER', 'actor')).rejects.toThrow('cannot assign financial access to themselves');
  });

  it('revokes the last financial role by removing the membership', async () => {
    const deleteMembership = jest.fn().mockResolvedValue(undefined);
    const service = new MembershipService({
      getMembership: jest.fn().mockResolvedValue({ id: 'user-b__tenant-a', userId: 'user-b', tenantId: 'tenant-a', role: 'FINANCE_VIEWER', roles: ['FINANCE_VIEWER'] }),
      deleteMembership,
    } as never);
    await expect(service.revokeFinancialRole('user-b', 'tenant-a', 'FINANCE_VIEWER')).resolves.toMatchObject({ roles: [], membershipDeleted: true });
    expect(deleteMembership).toHaveBeenCalledWith('user-b', 'tenant-a');
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
