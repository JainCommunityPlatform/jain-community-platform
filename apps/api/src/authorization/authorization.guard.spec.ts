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

  function guard(
    permission: Permission | undefined,
    requestUser: AuthenticatedRequest['user'],
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
    const policy = new AuthorizationPolicy();

    const authorizationGuard = new AuthorizationGuard(
      reflector,
      identity,
      membershipService,
      tenantContext,
      policy,
    );

    const executionContext = {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({
        getRequest: () => ({ user: requestUser }),
      }),
    } as unknown as ExecutionContext;

    return {
      ...authorizationGuard,
      canActivate: authorizationGuard.canActivate.bind(authorizationGuard),
    } as AuthorizationGuard;
  }

  const member: AuthorizationContext['membership'] = {
    userId: 'user-a',
    tenantId: 'tenant-a',
    role: 'FINANCE_VIEWER',
  };

  it('allows routes without a permission requirement', async () => {
    expect(await guard(undefined, undefined, null, null).canActivate(
      {} as ExecutionContext,
    )).toBe(true);
  });

  it('denies a protected route without authentication', async () => {
    await expect(
      guard('finance.read', undefined, { id: 'tenant-a' }, member).canActivate(
        {} as ExecutionContext,
      ),
    ).rejects.toThrow(
      new UnauthorizedException('Authenticated user context is missing'),
    );
  });

  it('allows a role with the required permission', async () => {
    const authorizationGuard = guard(
      'finance.read',
      { subject: 'user-a' },
      { id: 'tenant-a' },
      member,
    );
    const context = {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => ({ user: { subject: 'user-a' } }) }),
    } as unknown as ExecutionContext;

    await expect(authorizationGuard.canActivate(context)).resolves.toBe(true);
  });

  it('denies a role without the required permission', async () => {
    const authorizationGuard = guard(
      'finance.write',
      { subject: 'user-a' },
      { id: 'tenant-a' },
      member,
    );
    const context = {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => ({ user: { subject: 'user-a' } }) }),
    } as unknown as ExecutionContext;

    await expect(authorizationGuard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Permission denied'),
    );
  });

  it('denies a membership whose tenant differs from the resolved tenant', async () => {
    const authorizationGuard = guard(
      'finance.read',
      { subject: 'user-a' },
      { id: 'tenant-a' },
      { ...member, tenantId: 'tenant-b' },
    );
    const context = {
      getHandler: () => handler,
      getClass: () => controller,
      switchToHttp: () => ({ getRequest: () => ({ user: { subject: 'user-a' } }) }),
    } as unknown as ExecutionContext;

    await expect(authorizationGuard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Tenant access denied'),
    );
  });
});
