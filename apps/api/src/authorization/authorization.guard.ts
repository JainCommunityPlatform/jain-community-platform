import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthenticatedRequest } from '../auth/authenticated-request';
import { UserIdentityService } from '../identity/user-identity.service';
import { TenantContextStore } from '../tenant/tenant-context.store';
import { AuthorizationPolicy } from './authorization.policy';
import { MembershipService } from './membership.service';
import { REQUIRED_PERMISSION_KEY } from './require-permission.decorator';
import { AuthorizationContext, Permission } from './authorization.types';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly identity: UserIdentityService,
    private readonly membership: MembershipService,
    private readonly tenantContext: TenantContextStore,
    private readonly policy: AuthorizationPolicy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<Permission>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!permission) return true;

    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authenticated user context is missing');
    }

    const tenant = this.tenantContext.get();
    const currentUser = await this.identity.resolve(user);

    const authorization: AuthorizationContext = {
      userId: currentUser.id,
      tenantId: tenant?.id ?? '',
      platformRoles: currentUser.platformRoles,
      membership: tenant
        ? await this.membership.resolve(currentUser.id, tenant.id)
        : null,
    };

    if (permission.startsWith('platform.')) {
      this.policy.assertPlatformPermission(authorization, permission);
      return true;
    }

    if (!tenant) {
      throw new ForbiddenException('Tenant authorization context is required');
    }

    this.policy.assertPermission(authorization, permission);
    return true;
  }
}
