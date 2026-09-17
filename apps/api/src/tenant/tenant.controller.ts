import { Controller, Get, Query } from '@nestjs/common';

import { TenantService } from './tenant.service';

@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get('resolve')
  resolve(@Query('hostname') hostname?: string) {
    return this.tenantService.resolve(hostname ?? '');
  }
}
