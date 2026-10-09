import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';

import { AuthenticationGuard } from '../auth/authentication.guard';
import { AuthorizationGuard } from './authorization.guard';
import { MembershipContextStore } from './membership-context.store';
import { MembershipService } from './membership.service';
import { RequirePermission } from './require-permission.decorator';
import { TenantContextStore } from '../tenant/tenant-context.store';
import { FirestoreService } from '../database/firestore.service';
import { UpdateMembershipRolesDto } from './dto/update-membership-roles.dto';

@Controller('memberships')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
export class TenantMembershipController {
  constructor(
    private readonly memberships: MembershipService,
    private readonly tenantContext: TenantContextStore,
    private readonly membershipContext: MembershipContextStore,
    private readonly firestore: FirestoreService,
  ) {}

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
