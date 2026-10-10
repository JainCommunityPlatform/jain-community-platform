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
  ): AuthorizationContext => ({ userId, tenantId, platformRoles: [], membership });

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

  it('does not grant finance access to Tenant Admin by default', () => {
    const admin = context();

    for (const permission of [
      'finance.read',
      'finance.write',
      'finance.approve',
      'audit.read',
    ] as const) {
      expect(policy.hasPermission(admin, permission)).toBe(false);
    }

    for (const permission of [
      'tenant.read',
      'tenant.manage',
      'content.manage',
      'events.manage',
      'inventory.manage',
    ] as const) {
      expect(policy.hasPermission(admin, permission)).toBe(true);
    }
  });

  it('grants Tenant Finance basic financial operations but not approval', () => {
    const finance = context('user-a', 'tenant-a', {
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'TENANT_FINANCE',
    });

    expect(policy.hasPermission(finance, 'finance.read')).toBe(true);
    expect(policy.hasPermission(finance, 'finance.write')).toBe(true);
    expect(policy.hasPermission(finance, 'finance.approve')).toBe(false);
    expect(policy.hasPermission(finance, 'tenant.manage')).toBe(false);
    expect(policy.hasPermission(finance, 'platform.tenant.manage')).toBe(false);
  });

  it('keeps finance viewer read-only', () => {
    const viewer = context('user-a', 'tenant-a', {
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'FINANCE_VIEWER',
    });

    expect(policy.hasPermission(viewer, 'finance.read')).toBe(true);
    expect(policy.hasPermission(viewer, 'finance.write')).toBe(false);
    expect(policy.hasPermission(viewer, 'finance.approve')).toBe(false);
  });

  it('combines explicitly assigned roles without elevating unrelated permissions', () => {
    const combined = context('user-a', 'tenant-a', {
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'TENANT_ADMIN',
      roles: ['TENANT_ADMIN', 'TENANT_FINANCE'],
    });

    expect(policy.hasPermission(combined, 'finance.read')).toBe(false);
    expect(policy.hasPermission(combined, 'tenant.manage')).toBe(true);
    expect(policy.hasPermission(combined, 'finance.approve')).toBe(false);
  });

  it('does not let a role from another tenant authorize the current tenant', () => {
    const contextForWrongTenant = context('user-a', 'tenant-b', {
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'TENANT_FINANCE',
    });

    expect(policy.hasPermission(contextForWrongTenant, 'finance.read')).toBe(false);
    expect(policy.hasPermission(contextForWrongTenant, 'finance.write')).toBe(false);
  });

  it('supports the existing finance operator and approver separation', () => {
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

  it('denies financial permissions even if a tenant admin has a legacy financial role', () => {
    const legacyCombined = context('user-a', 'tenant-a', {
      userId: 'user-a', tenantId: 'tenant-a', role: 'TENANT_ADMIN',
      roles: ['TENANT_ADMIN', 'FINANCE_APPROVER', 'CA_AUDITOR'],
    });
    expect(policy.hasPermission(legacyCombined, 'finance.read')).toBe(false);
    expect(policy.hasPermission(legacyCombined, 'finance.write')).toBe(false);
    expect(policy.hasPermission(legacyCombined, 'finance.approve')).toBe(false);
    expect(policy.hasPermission(legacyCombined, 'audit.read')).toBe(false);
  });

  it('allows platform administrators to manage finance team assignments without tenant membership', () => {
    const platformContext: AuthorizationContext = {
      userId: 'platform-user', tenantId: '', platformRoles: ['PLATFORM_ADMIN'], membership: null,
    };
    expect(() => policy.assertPlatformPermission(platformContext, 'platform.finance.team.manage')).not.toThrow();
  });

  it('keeps platform administration separate from tenant roles', () => {
    expect(() => policy.assertPlatformPermission({
      userId: 'platform-user',
      tenantId: '',
      platformRoles: ['PLATFORM_ADMIN'],
      membership: null,
    }, 'platform.tenant.manage')).not.toThrow();

    expect(() => policy.assertPlatformPermission({
      userId: 'tenant-admin',
      tenantId: 'tenant-a',
      platformRoles: [],
      membership: {
        userId: 'tenant-admin',
        tenantId: 'tenant-a',
        role: 'TENANT_ADMIN',
      },
    }, 'platform.tenant.manage')).toThrow('Platform administrator permission is required');
  });
});
