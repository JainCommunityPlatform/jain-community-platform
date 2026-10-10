import { FinanceTeamController } from './finance-team.controller';

describe('FinanceTeamController', () => {
  const memberships = {
    listTenantMemberships: jest.fn(),
    grantFinancialRoleByEmail: jest.fn(),
    revokeFinancialRole: jest.fn(),
  };
  const firestore = {
    getTenantById: jest.fn(),
    recordAudit: jest.fn().mockResolvedValue(undefined),
  };
  const auth = { get: jest.fn().mockReturnValue({ uid: 'platform-auth' }) };
  const identity = { resolve: jest.fn().mockResolvedValue({ id: 'platform-user' }) };

  const controller = () => new FinanceTeamController(
    memberships as never,
    firestore as never,
    auth as never,
    identity as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    firestore.getTenantById.mockResolvedValue({ id: 'tenant-a', name: 'Temple A' });
    firestore.recordAudit.mockResolvedValue(undefined);
    auth.get.mockReturnValue({ uid: 'platform-auth' });
    identity.resolve.mockResolvedValue({ id: 'platform-user' });
  });

  it('lists only finance-team roles and omits phone details', async () => {
    memberships.listTenantMemberships.mockResolvedValue([
      {
        userId: 'finance-user',
        role: 'FINANCE_VIEWER',
        roles: ['FINANCE_VIEWER', 'CONTENT_MANAGER'],
        user: { email: 'finance@example.test', displayName: 'Finance User', primaryPhone: '9999999999' },
      },
      {
        userId: 'content-user',
        role: 'CONTENT_MANAGER',
        roles: ['CONTENT_MANAGER'],
        user: { email: 'content@example.test', displayName: 'Content User', primaryPhone: null },
      },
    ]);

    await expect(controller().list('tenant-a')).resolves.toEqual([
      {
        userId: 'finance-user',
        email: 'finance@example.test',
        displayName: 'Finance User',
        roles: ['FINANCE_VIEWER'],
      },
    ]);
  });

  it('grants a financial role and writes a tenant-scoped audit record', async () => {
    memberships.grantFinancialRoleByEmail.mockResolvedValue({
      id: 'user-a__tenant-a',
      userId: 'user-a',
      tenantId: 'tenant-a',
      roles: ['FINANCE_OPERATOR', 'CONTENT_MANAGER'],
    });

    await expect(controller().grant('tenant-a', {
      email: 'finance@example.test',
      role: 'FINANCE_OPERATOR',
    })).resolves.toEqual({
      userId: 'user-a',
      tenantId: 'tenant-a',
      roles: ['FINANCE_OPERATOR'],
    });

    expect(memberships.grantFinancialRoleByEmail).toHaveBeenCalledWith(
      'finance@example.test',
      'tenant-a',
      'FINANCE_OPERATOR',
      'platform-user',
    );
    expect(firestore.recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-a',
      userId: 'platform-user',
      action: 'TENANT_FINANCE_ROLE_GRANTED',
      metadata: expect.objectContaining({ targetUserId: 'user-a', role: 'FINANCE_OPERATOR' }),
    }));
  });

  it('revokes a financial role and records the result', async () => {
    memberships.revokeFinancialRole.mockResolvedValue({
      id: 'user-a__tenant-a',
      userId: 'user-a',
      tenantId: 'tenant-a',
      roles: [],
      previousRoles: ['FINANCE_VIEWER'],
      membershipDeleted: true,
    });

    await expect(controller().revoke('tenant-a', 'user-a', 'FINANCE_VIEWER')).resolves.toEqual({
      userId: 'user-a',
      tenantId: 'tenant-a',
      roles: [],
      membershipDeleted: true,
    });
    expect(firestore.recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-a',
      action: 'TENANT_FINANCE_ROLE_REVOKED',
      metadata: expect.objectContaining({ targetUserId: 'user-a', membershipDeleted: true }),
    }));
  });

  it('does not list a nonexistent tenant', async () => {
    firestore.getTenantById.mockResolvedValue(null);
    await expect(controller().list('missing')).rejects.toThrow('Tenant not found');
    expect(memberships.listTenantMemberships).not.toHaveBeenCalled();
  });
});
