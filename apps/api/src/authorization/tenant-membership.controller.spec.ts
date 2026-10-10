import { ForbiddenException } from '@nestjs/common';

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
        role: 'CONTENT_MANAGER',
        roles: ['CONTENT_MANAGER'],
        user: { email: 'member@example.test', displayName: 'Member', primaryPhone: null },
      },
    ]),
    assignRolesByEmail: jest.fn().mockResolvedValue({
      id: 'user-a__tenant-a',
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'CONTENT_MANAGER',
      roles: ['CONTENT_MANAGER'],
    }),
    assignRoles: jest.fn().mockResolvedValue({
      id: 'user-a__tenant-a',
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'CONTENT_MANAGER',
      roles: ['CONTENT_MANAGER'],
    }),
  };

  const controller = () => new TenantMembershipController(
    memberships as never,
    tenant as never,
    context as never,
    firestore as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    tenant.get.mockReturnValue({ id: 'tenant-a' });
    context.get.mockReturnValue({ userId: 'actor-a', tenantId: 'tenant-a' });
  });

  it('lists team members without exposing phone details', async () => {
    await expect(controller().listMemberships()).resolves.toEqual([
      {
        userId: 'user-a',
        email: 'member@example.test',
        displayName: 'Member',
        role: 'CONTENT_MANAGER',
        roles: ['CONTENT_MANAGER'],
      },
    ]);
  });

  it('allows general tenant membership assignment for non-financial roles and audits it', async () => {
    await expect(controller().assignRolesByEmail({
      email: 'member@example.test',
      roles: ['CONTENT_MANAGER'],
    })).resolves.toMatchObject({
      userId: 'user-a',
      roles: ['CONTENT_MANAGER'],
    });

    expect(memberships.assignRolesByEmail).toHaveBeenCalledWith(
      'member@example.test',
      'tenant-a',
      ['CONTENT_MANAGER'],
    );
    expect(firestore.recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'TENANT_MEMBERSHIP_ROLES_UPDATED',
      tenantId: 'tenant-a',
      userId: 'actor-a',
    }));
  });

  it.each([
    'TENANT_FINANCE',
    'FINANCE_VIEWER',
    'FINANCE_OPERATOR',
    'FINANCE_APPROVER',
    'CA_AUDITOR',
  ])('rejects assignment of financial role %s through general membership endpoint', async (role) => {
    await expect(controller().assignRolesByEmail({
      email: 'member@example.test',
      roles: [role],
    })).rejects.toThrow(ForbiddenException);
    expect(memberships.assignRolesByEmail).not.toHaveBeenCalled();
  });

  it('rejects financial role changes through the general membership endpoint', async () => {
    await expect(controller().updateRoles('user-a', {
      roles: ['TENANT_FINANCE'],
    })).rejects.toThrow(ForbiddenException);
    expect(memberships.assignRoles).not.toHaveBeenCalled();
  });

  it('updates an existing member role set when it contains only general roles', async () => {
    await expect(controller().updateRoles('user-a', {
      roles: ['CONTENT_MANAGER'],
    })).resolves.toMatchObject({
      userId: 'user-a',
      roles: ['CONTENT_MANAGER'],
    });
    expect(memberships.assignRoles).toHaveBeenCalledWith(
      'user-a',
      'tenant-a',
      ['CONTENT_MANAGER'],
    );
  });
});
