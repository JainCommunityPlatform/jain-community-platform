import { ForbiddenException } from '@nestjs/common';

import { AuthorizationPolicy } from './authorization.policy';
import { AuthorizationContext } from './authorization.types';

describe('AuthorizationPolicy', () => {
  const policy = new AuthorizationPolicy();

  const context = (
    userId = 'user-a',
    tenantId = 'tenant-a',
    membership: AuthorizationContext['membership'] = {
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'TENANT_ADMIN',
    },
  ): AuthorizationContext => ({ userId, tenantId, membership });

  it('allows a member to access the tenant they belong to', () => {
    expect(() => policy.assertTenantAccess(context())).not.toThrow();
  });

  it('denies a user with no membership', () => {
    expect(() => policy.assertTenantAccess(context('user-a', 'tenant-a', null)))
      .toThrow(new ForbiddenException('Tenant membership is required'));
  });

  it('denies a membership from another tenant', () => {
    expect(() =>
      policy.assertTenantAccess(
        context('user-a', 'tenant-a', {
          userId: 'user-a',
          tenantId: 'tenant-b',
          role: 'TENANT_ADMIN',
        }),
      ),
    ).toThrow(new ForbiddenException('Tenant access denied'));
  });

  it('denies a membership belonging to another user', () => {
    expect(() =>
      policy.assertTenantAccess(
        context('user-a', 'tenant-a', {
          userId: 'user-b',
          tenantId: 'tenant-a',
          role: 'TENANT_ADMIN',
        }),
      ),
    ).toThrow(new ForbiddenException('Tenant access denied'));
  });

  it('does not grant access when the current tenant differs from the membership tenant', () => {
    const tenantB = context('user-a', 'tenant-b', {
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'TENANT_ADMIN',
    });

    expect(policy.hasPermission(tenantB, 'tenant.read')).toBe(false);
    expect(policy.hasPermission(tenantB, 'finance.read')).toBe(false);
  });

  it('enforces role permissions', () => {
    const financeViewer = context('user-a', 'tenant-a', {
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'FINANCE_VIEWER',
    });

    expect(policy.hasPermission(financeViewer, 'finance.read')).toBe(true);
    expect(policy.hasPermission(financeViewer, 'finance.write')).toBe(false);
    expect(policy.hasPermission(financeViewer, 'finance.approve')).toBe(false);
  });

  it('allows tenant admins all defined tenant permissions', () => {
    const admin = context();

    for (const permission of [
      'tenant.read',
      'tenant.manage',
      'content.manage',
      'events.manage',
      'inventory.manage',
      'finance.read',
      'finance.write',
      'finance.approve',
      'audit.read',
    ] as const) {
      expect(policy.hasPermission(admin, permission)).toBe(true);
    }
  });

  it('supports the documented finance role separation', () => {
    const operator = context('user-a', 'tenant-a', {
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'FINANCE_OPERATOR',
    });
    const approver = context('user-a', 'tenant-a', {
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'FINANCE_APPROVER',
    });

    expect(policy.hasPermission(operator, 'finance.write')).toBe(true);
    expect(policy.hasPermission(operator, 'finance.approve')).toBe(false);
    expect(policy.hasPermission(approver, 'finance.approve')).toBe(true);
  });
});
