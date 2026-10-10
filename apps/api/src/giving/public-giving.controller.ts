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
    const campaigns = await this.giving.listPublicCampaigns(tenant.id);
    return campaigns.map((campaign) => ({
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      targetAmountPaise: campaign.targetAmountPaise,
      currency: campaign.currency,
      status: campaign.status,
      createdAt: campaign.createdAt,
    }));
  }
}
