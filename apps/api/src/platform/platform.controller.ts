import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { AuthenticationGuard } from '../auth/authentication.guard';
import { AuthorizationGuard } from '../authorization/authorization.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { AuthContextStore } from '../auth/auth-context.store';
import { UserIdentityService } from '../identity/user-identity.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { PlatformService } from './platform.service';

@Controller('platform')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
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
    const actor = authenticated
      ? await this.identity.resolve(authenticated)
      : null;
    if (!actor) throw new Error('Authenticated platform user is required');

    return this.platform.createTenant(dto, actor.id);
  }
}
