import { BadRequestException, Controller, Get } from '@nestjs/common';

import { TenantContextStore } from '../tenant/tenant-context.store';
import { GivingService } from './giving.service';

@Controller('giving/campaigns')
export class PublicGivingController {
  constructor(
    private readonly giving: GivingService,
    private readonly tenantContext: TenantContextStore,
  ) {}

  @Get()
  async listCampaigns() {
    const tenant = this.tenantContext.get();
    if (!tenant) throw new BadRequestException('Tenant context is required');
    return this.giving.listPublicCampaigns(tenant.id);
  }
}
