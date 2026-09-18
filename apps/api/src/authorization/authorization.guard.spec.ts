import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthorizationGuard } from './authorization.guard';
import { AuthorizationPolicy } from './authorization.policy';
import { MembershipContextStore } from './membership-context.store';
import { AuthorizationContext, Permission } from './authorization.types';

describe('AuthorizationGuard', () => {
  const handler = jest.fn();
  const controller = class TestController {};
  const executionContext = {
    getHandler: () => handler,
    getClass: () => controller,
  } as unknown as ExecutionContext;

  function guard(
    permission: Permission | undefined,
    authorization: AuthorizationContext | null,
  ): AuthorizationGuard {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(permission),
    } as unknown as Reflector;
    const membershipContext = {
      get: jest.fn().mockReturnValue(authorization),
    } as unknown as MembershipContextStore;
    const policy = new AuthorizationPolicy();

    return new AuthorizationGuard(reflector, membershipContext, policy);
  }

  const member: AuthorizationContext = {
    userId: 'user-a',
    tenantId: 'tenant-a',
    membership: {
      userId: 'user-a',
      tenantId: 'tenant-a',
      role: 'FINANCE_VIEWER',
    },
  };

  it('allows routes without a permission requirement', () => {
    expect(guard(undefined, null).canActivate(executionContext)).toBe(true);
  });

  it('denies a protected route without authorization context', () => {
    expect(() =>
      guard('finance.read', null).canActivate(executionContext),
    ).toThrow(
      new ForbiddenException('Tenant authorization context is required'),
    );
  });

  it('allows a role with the required permission', () => {
    expect(guard('finance.read', member).canActivate(executionContext)).toBe(
      true,
    );
  });

  it('denies a role without the required permission', () => {
    expect(() =>
      guard('finance.write', member).canActivate(executionContext),
    ).toThrow(new ForbiddenException('Permission denied'));
  });

  it('denies a membership whose tenant differs from the resolved tenant', () => {
    const crossTenant: AuthorizationContext = {
      ...member,
      tenantId: 'tenant-b',
    };

    expect(() =>
      guard('finance.read', crossTenant).canActivate(executionContext),
    ).toThrow(new ForbiddenException('Tenant access denied'));
  });
});
