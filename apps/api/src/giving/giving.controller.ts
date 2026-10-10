import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { AuthenticationGuard } from '../auth/authentication.guard';
import { AuthenticationContextInterceptor } from '../auth/authentication-context.interceptor';
import { AuthContextStore } from '../auth/auth-context.store';
import { AuthorizationGuard } from '../authorization/authorization.guard';
import { MembershipContextInterceptor } from '../authorization/membership-context.interceptor';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { AuditService } from '../audit/audit.service';
import { UserIdentityService } from '../identity/user-identity.service';
import { TenantContextStore } from '../tenant/tenant-context.store';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CreatePledgeDto } from './dto/create-pledge.dto';
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto';
import { GivingService } from './giving.service';

@Controller('giving')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@UseInterceptors(AuthenticationContextInterceptor, MembershipContextInterceptor)
export class GivingController {
  constructor(
    private readonly giving: GivingService,
    private readonly tenantContext: TenantContextStore,
    private readonly auth: AuthContextStore,
    private readonly identity: UserIdentityService,
    private readonly audit: AuditService,
  ) {}

  @Post('campaigns')
  @RequirePermission('finance.write')
  async createCampaign(@Body() dto: CreateCampaignDto) {
    const tenant = this.requireTenant();
    const actor = await this.requireActor();
    const campaign = await this.giving.createCampaign({
      tenantId: tenant.id,
      actorUserId: actor.id,
      ...dto,
    });
    await this.audit.record({
      action: 'GIVING_CAMPAIGN_CREATED',
      entity: 'GivingCampaign',
      entityId: campaign.id,
      metadata: { name: campaign.name, status: campaign.status },
    });
    return campaign;
  }

  @Patch('campaigns/:campaignId/status')
  @RequirePermission('finance.write')
  async updateCampaignStatus(
    @Param('campaignId') campaignId: string,
    @Body() dto: UpdateCampaignStatusDto,
  ) {
    const tenant = this.requireTenant();
    const campaign = await this.giving.updateCampaignStatus(
      tenant.id,
      campaignId,
      dto.status,
    );
    await this.audit.record({
      action: 'GIVING_CAMPAIGN_STATUS_UPDATED',
      entity: 'GivingCampaign',
      entityId: campaign.id,
      metadata: { status: campaign.status },
    });
    return campaign;
  }

  @Post('pledges')
  async createPledge(
    @Body() dto: CreatePledgeDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const tenant = this.requireTenant();
    const actor = await this.requireActor();
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    const pledge = await this.giving.createPledge({
      tenantId: tenant.id,
      donorUserId: actor.id,
      ...dto,
      idempotencyKey,
    });
    await this.audit.record({
      action: 'DONATION_PLEDGE_CREATED',
      entity: 'DonationPledge',
      entityId: pledge.id,
      metadata: { campaignId: pledge.campaignId, pledgedAmountPaise: pledge.pledgedAmountPaise },
    });
    return pledge;
  }

  @Get('my-pledges')
  async listMyPledges() {
    const tenant = this.requireTenant();
    const actor = await this.requireActor();
    return this.giving.listMyPledges(tenant.id, actor.id);
  }

  @Get('pledges')
  @RequirePermission('finance.read')
  async listTenantPledges() {
    const tenant = this.requireTenant();
    return this.giving.listTenantPledges(tenant.id);
  }

  private requireTenant() {
    const tenant = this.tenantContext.get();
    if (!tenant) throw new BadRequestException('Tenant context is required');
    return tenant;
  }

  private async requireActor() {
    const authenticated = this.auth.get();
    const actor = authenticated ? await this.identity.resolve(authenticated) : null;
    if (!actor) throw new UnauthorizedException('Authenticated user context is required');
    return actor;
  }
}
