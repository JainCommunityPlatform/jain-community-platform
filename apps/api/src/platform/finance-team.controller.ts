import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { AuthenticationGuard } from '../auth/authentication.guard';
import { AuthenticationContextInterceptor } from '../auth/authentication-context.interceptor';
import { AuthContextStore } from '../auth/auth-context.store';
import { AuthorizationGuard } from '../authorization/authorization.guard';
import {
  FINANCIAL_MEMBERSHIP_ROLES,
  MembershipService,
} from '../authorization/membership.service';
import { MembershipRole } from '../authorization/authorization.types';
import { MembershipContextInterceptor } from '../authorization/membership-context.interceptor';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { FirestoreService } from '../database/firestore.service';
import { UserIdentityService } from '../identity/user-identity.service';
import { AssignFinanceRoleDto } from '../authorization/dto/assign-finance-role.dto';

@Controller('platform/tenants/:tenantId/finance-team')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@UseInterceptors(AuthenticationContextInterceptor, MembershipContextInterceptor)
@RequirePermission('platform.finance.team.manage')
export class FinanceTeamController {
  constructor(
    private readonly memberships: MembershipService,
    private readonly firestore: FirestoreService,
    private readonly auth: AuthContextStore,
    private readonly identity: UserIdentityService,
  ) {}

  @Get()
  async list(@Param('tenantId') tenantId: string) {
    await this.ensureTenantExists(tenantId);
    const memberships = await this.memberships.listTenantMemberships(tenantId);
    return memberships
      .map((membership) => ({
        userId: membership.userId,
        email: membership.user?.email ?? null,
        displayName: membership.user?.displayName ?? null,
        roles: (membership.roles?.length ? membership.roles : [membership.role])
          .filter((role) => FINANCIAL_MEMBERSHIP_ROLES.has(role as MembershipRole)),
      }))
      .filter((membership) => membership.roles.length > 0);
  }

  @Post()
  async grant(
    @Param('tenantId') tenantId: string,
    @Body() dto: AssignFinanceRoleDto,
  ) {
    await this.ensureTenantExists(tenantId);
    const actor = await this.requireActor();
    const membership = await this.memberships.grantFinancialRoleByEmail(
      dto.email,
      tenantId,
      dto.role,
      actor.id,
    );
    await this.firestore.recordAudit({
      tenantId,
      userId: actor.id,
      action: 'TENANT_FINANCE_ROLE_GRANTED',
      entity: 'TenantMembership',
      entityId: membership.id,
      metadata: {
        targetUserId: membership.userId,
        role: dto.role,
        roles: membership.roles,
      },
    });
    return {
      userId: membership.userId,
      tenantId,
      roles: membership.roles.filter((role) =>
        FINANCIAL_MEMBERSHIP_ROLES.has(role as never),
      ),
    };
  }

  @Delete(':userId/:role')
  async revoke(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Param('role') role: string,
  ) {
    await this.ensureTenantExists(tenantId);
    const actor = await this.requireActor();
    const result = await this.memberships.revokeFinancialRole(
      userId,
      tenantId,
      role,
    );
    await this.firestore.recordAudit({
      tenantId,
      userId: actor.id,
      action: 'TENANT_FINANCE_ROLE_REVOKED',
      entity: 'TenantMembership',
      entityId: result.id,
      metadata: {
        targetUserId: userId,
        role,
        previousRoles: result.previousRoles,
        remainingRoles: result.roles,
        membershipDeleted: result.membershipDeleted,
      },
    });
    return {
      userId,
      tenantId,
      roles: result.roles.filter((currentRole) =>
        FINANCIAL_MEMBERSHIP_ROLES.has(currentRole as MembershipRole),
      ),
      membershipDeleted: result.membershipDeleted,
    };
  }

  private async ensureTenantExists(tenantId: string): Promise<void> {
    if (!tenantId.trim() || !(await this.firestore.getTenantById(tenantId))) {
      throw new NotFoundException('Tenant not found');
    }
  }

  private async requireActor() {
    const authenticated = this.auth.get();
    const actor = authenticated ? await this.identity.resolve(authenticated) : null;
    if (!actor) {
      throw new UnauthorizedException('Authenticated platform user is required');
    }
    return actor;
  }
}
