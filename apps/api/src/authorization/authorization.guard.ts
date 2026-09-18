import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthorizationPolicy } from './authorization.policy';
import { MembershipContextStore } from './membership-context.store';
import { REQUIRED_PERMISSION_KEY } from './require-permission.decorator';
import { Permission } from './authorization.types';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly membershipContext: MembershipContextStore,
    private readonly policy: AuthorizationPolicy,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<Permission>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permission) return true;

    const authorization = this.membershipContext.get();
    if (!authorization) {
      throw new ForbiddenException('Tenant authorization context is required');
    }

    this.policy.assertPermission(authorization, permission);
    return true;
  }
}
