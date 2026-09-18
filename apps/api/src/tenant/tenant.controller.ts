import {
  Controller,
  Get,
  NotFoundException,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AuthorizationGuard } from '../authorization/authorization.guard';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { TenantContextStore } from './tenant-context.store';
import { TenantService } from './tenant.service';
import { TenantContext } from './tenant.types';

@Controller('tenant')
export class TenantController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly tenantContextStore: TenantContextStore,
  ) {}

  @Get('resolve')
  async resolve(@Query('hostname') hostname?: string): Promise<TenantContext> {
    const tenant = await this.tenantService.resolve(hostname ?? '');

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  @Get('context')
  @UseGuards(AuthenticationGuard, AuthorizationGuard)
  @RequirePermission('tenant.read')
  getContext(): TenantContext {
    const tenant = this.tenantContextStore.get();

    if (!tenant) {
      throw new NotFoundException('Tenant context not found');
    }

    return tenant;
  }
}
