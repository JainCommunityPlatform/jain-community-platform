import { ForbiddenException } from '@nestjs/common';

import { AuthorizationContext, Permission } from './authorization.types';

const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  TENANT_ADMIN: [
    'tenant.read',
    'tenant.manage',
    'content.manage',
    'events.manage',
    'inventory.manage',
    'finance.read',
    'finance.write',
    'finance.approve',
    'audit.read',
  ],
  CONTENT_MANAGER: ['tenant.read', 'content.manage'],
  EVENT_MANAGER: ['tenant.read', 'events.manage'],
  INVENTORY_MANAGER: ['tenant.read', 'inventory.manage'],
  FINANCE_VIEWER: ['tenant.read', 'finance.read'],
  FINANCE_OPERATOR: ['tenant.read', 'finance.read', 'finance.write'],
  FINANCE_APPROVER: [
    'tenant.read',
    'finance.read',
    'finance.write',
    'finance.approve',
  ],
  CA_AUDITOR: ['tenant.read', 'finance.read', 'audit.read'],
};

export class AuthorizationPolicy {
  assertTenantAccess(context: AuthorizationContext): void {
    if (!context.membership) {
      throw new ForbiddenException('Tenant membership is required');
    }

    if (
      context.membership.userId !== context.userId ||
      context.membership.tenantId !== context.tenantId
    ) {
      throw new ForbiddenException('Tenant access denied');
    }
  }

  assertPermission(
    context: AuthorizationContext,
    permission: Permission,
  ): void {
    this.assertTenantAccess(context);

    const permissions = ROLE_PERMISSIONS[context.membership!.role] ?? [];
    if (!permissions.includes(permission)) {
      throw new ForbiddenException('Permission denied');
    }
  }

  hasPermission(
    context: AuthorizationContext,
    permission: Permission,
  ): boolean {
    try {
      this.assertPermission(context, permission);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) return false;
      throw error;
    }
  }
}
