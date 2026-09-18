import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthenticatedRequest } from '../auth/authenticated-request';
import { UserIdentityService } from '../identity/user-identity.service';
import { TenantContextStore } from '../tenant/tenant-context.store';
import { AuthorizationGuard } from './authorization.guard';
import { AuthorizationPolicy } from './authorization.policy';
import { MembershipService } from './membership.service';
import { AuthorizationContext, Permission } from './authorization.types';

describe('AuthorizationGuard', () => {
  const handler = jest.fn();
  const controller = class TestController {};

  function createContext(
    user: AuthenticatedRequest['user'],
  ): ExecutionContext {
    return {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  function createGuard(
    permission: Permission | undefined,
    tenant: { id: string } | null,
    membership: AuthorizationContext['membership'],
  ): AuthorizationGuard {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(permission),
    } as unknown as Reflector;
    const identity = {
      resolve: jest.fn(async (user: NonNullable<AuthenticatedRequest['user']>) => ({
        id: user.subject,
        authSubject: user.subject,
        email: user.email,
        displayName: user.displayName,
      })),
    } as unknown as UserIdentityService;
    const membershipService = {
      resolve: jest.fn().mockResolvedValue(membership),
    } as unknown as MembershipService;
    const tenantContext = {
      get: jest.fn().mockReturnValue(tenant),
    } as unknown as TenantContextStore;

    return new AuthorizationGuard(
      reflector,
      identity,
      membershipService,
      tenantContext,
      new AuthorizationPolicy(),
    );
  }

  const member: AuthorizationContext['membership'] = {
    userId: 'user-a',
    tenantId: 'tenant-a',
    role: 'FINANCE_VIEWER',
  };

  it('allows routes without a permission requirement', async () => {
    const guard = createGuard(undefined, null, null);

    await expect(guard.canActivate(createContext(undefined))).resolves.toBe(
      true,
    );
  });

  it('denies a protected route without authentication', async () => {
    const guard = createGuard('finance.read', { id: 'tenant-a' }, member);

    await expect(guard.canActivate(createContext(undefined))).rejects.toThrow(
      new UnauthorizedException('Authenticated user context is missing'),
    );
  });

  it('allows a role with the required permission', async () => {
    const guard = createGuard('finance.read', { id: 'tenant-a' }, member);

    await expect(
      guard.canActivate(createContext({ subject: 'user-a' })),
    ).resolves.toBe(true);
  });

  it('denies a role without the required permission', async () => {
    const guard = createGuard('finance.write', { id: 'tenant-a' }, member);

    await expect(
      guard.canActivate(createContext({ subject: 'user-a' })),
    ).rejects.toThrow(new ForbiddenException('Permission denied'));
  });

  it('denies a membership whose tenant differs from the resolved tenant', async () => {
    const guard = createGuard(
      'finance.read',
      { id: 'tenant-a' },
      { ...member, tenantId: 'tenant-b' },
    );

    await expect(
      guard.canActivate(createContext({ subject: 'user-a' })),
    ).rejects.toThrow(new ForbiddenException('Tenant access denied'));
  });
});
