import { Controller, Get, NotFoundException, Query } from '@nestjs/common';

import { TenantService } from './tenant.service';
import { TenantContext } from './tenant.types';

@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('resolve')
  async resolve(@Query('hostname') hostname?: string): Promise<TenantContext> {
    const tenant = await this.tenantService.resolve(hostname ?? '');

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }
}
