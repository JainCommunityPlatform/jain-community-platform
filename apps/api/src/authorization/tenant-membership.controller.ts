import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { AuthenticationGuard } from '../auth/authentication.guard';
import { AuthenticationContextInterceptor } from '../auth/authentication-context.interceptor';
import { AuthorizationGuard } from './authorization.guard';
import { MembershipContextInterceptor } from './membership-context.interceptor';
import { MembershipContextStore } from './membership-context.store';
import { MembershipService } from './membership.service';
import { RequirePermission } from './require-permission.decorator';
import { TenantContextStore } from '../tenant/tenant-context.store';
import { FirestoreService } from '../database/firestore.service';
import { UpdateMembershipRolesDto } from './dto/update-membership-roles.dto';
import { AssignMembershipRolesDto } from './dto/assign-membership-roles.dto';

@Controller('memberships')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@UseInterceptors(AuthenticationContextInterceptor, MembershipContextInterceptor)
export class TenantMembershipController {
  constructor(
    private readonly memberships: MembershipService,
    private readonly tenantContext: TenantContextStore,
    private readonly membershipContext: MembershipContextStore,
    private readonly firestore: FirestoreService,
  ) {}

  @Get()
  @RequirePermission('tenant.manage')
  async listMemberships() {
    const tenant = this.tenantContext.get();
    if (!tenant) throw new BadRequestException('Tenant context is required');
    const memberships = await this.memberships.listTenantMemberships(tenant.id);
    return memberships.map((membership) => ({
      userId: membership.userId,
      email: membership.user?.email ?? null,
      displayName: membership.user?.displayName ?? null,
      role: membership.role,
      roles: membership.roles,
    }));
  }

  @Post('roles')
  @RequirePermission('tenant.manage')
  async assignRolesByEmail(@Body() dto: AssignMembershipRolesDto) {
    const tenant = this.tenantContext.get();
    const actor = this.membershipContext.get();
    if (!tenant || !actor) {
      throw new BadRequestException('Tenant context is required');
    }
    const membership = await this.memberships.assignRolesByEmail(
      dto.email,
      tenant.id,
      dto.roles,
    );
    await this.firestore.recordAudit({
      tenantId: tenant.id,
      userId: actor.userId,
      action: 'TENANT_MEMBERSHIP_ROLES_UPDATED',
      entity: 'TenantMembership',
      entityId: membership.id,
      metadata: { targetUserId: membership.userId, roles: membership.roles },
    });
    return {
      userId: membership.userId,
      tenantId: membership.tenantId,
      role: membership.role,
      roles: membership.roles,
    };
  }

  @Put(':userId/roles')
  @RequirePermission('tenant.manage')
  async updateRoles(
    @Param('userId') userId: string,
    @Body() dto: UpdateMembershipRolesDto,
  ) {
    const tenant = this.tenantContext.get();
    const actor = this.membershipContext.get();
    if (!tenant || !actor) {
      throw new BadRequestException('Tenant context is required');
    }

    const membership = await this.memberships.assignRoles(
      userId,
      tenant.id,
      dto.roles,
    );
    await this.firestore.recordAudit({
      tenantId: tenant.id,
      userId: actor.userId,
      action: 'TENANT_MEMBERSHIP_ROLES_UPDATED',
      entity: 'TenantMembership',
      entityId: membership.id,
      metadata: { targetUserId: userId, roles: membership.roles },
    });

    return {
      userId: membership.userId,
      tenantId: membership.tenantId,
      role: membership.role,
      roles: membership.roles,
    };
  }
}
