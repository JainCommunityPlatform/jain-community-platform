import { Body, Controller, Get, Param, Post, Put, UseGuards, UseInterceptors } from '@nestjs/common';

import { AuthenticationGuard } from '../auth/authentication.guard';
import { AuthenticationContextInterceptor } from '../auth/authentication-context.interceptor';
import { AuthorizationGuard } from '../authorization/authorization.guard';
import { MembershipContextInterceptor } from '../authorization/membership-context.interceptor';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { AuthContextStore } from '../auth/auth-context.store';
import { UserIdentityService } from '../identity/user-identity.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantAdminDto } from './dto/tenant-admin.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { PlatformService } from './platform.service';

@Controller('platform')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@UseInterceptors(AuthenticationContextInterceptor, MembershipContextInterceptor)
@RequirePermission('platform.tenant.manage')
export class PlatformController {
  constructor(
    private readonly platform: PlatformService,
    private readonly auth: AuthContextStore,
    private readonly identity: UserIdentityService,
  ) {}

  @Get('tenants')
  listTenants() {
    return this.platform.listTenants();
  }

  @Post('tenants')
  async createTenant(@Body() dto: CreateTenantDto) {
    const authenticated = this.auth.get();
    const actor = authenticated ? await this.identity.resolve(authenticated) : null;
    if (!actor) throw new Error('Authenticated platform user is required');

    return this.platform.createTenant(dto, actor.id);
  }

  @Get('tenants/:tenantId')
  getTenant(@Param('tenantId') tenantId: string) {
    return this.platform.getTenant(tenantId);
  }

  @Put('tenants/:tenantId')
  async updateTenant(@Param('tenantId') tenantId: string, @Body() dto: UpdateTenantDto) {
    const authenticated = this.auth.get();
    const actor = authenticated ? await this.identity.resolve(authenticated) : null;
    if (!actor) throw new Error('Authenticated platform user is required');
    return this.platform.updateTenant(tenantId, dto, actor.id);
  }

  @Get('tenants/:tenantId/admins')
  listTenantAdmins(@Param('tenantId') tenantId: string) {
    return this.platform.getTenant(tenantId).then((tenant) => tenant.admins);
  }

  @Post('tenants/:tenantId/admins')
  async addTenantAdmin(@Param('tenantId') tenantId: string, @Body() dto: TenantAdminDto) {
    const authenticated = this.auth.get();
    const actor = authenticated ? await this.identity.resolve(authenticated) : null;
    if (!actor) throw new Error('Authenticated platform user is required');
    return this.platform.addTenantAdmin(tenantId, dto, actor.id);
  }

  @Post('tenants/:tenantId/domain/verify')
  async verifyDomain(@Param('tenantId') tenantId: string) {
    return this.platform.verifyCustomDomain(tenantId);
  }
}
