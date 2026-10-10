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
import { RecordPaymentDto } from './dto/record-payment.dto';
import { RejectPaymentDto } from './dto/reject-payment.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { RejectExpenseDto } from './dto/reject-expense.dto';
import { CreateDonationAdjustmentDto } from './dto/create-donation-adjustment.dto';
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

  @Post('pledges/:pledgeId/payments')
  @RequirePermission('finance.write')
  async recordPayment(
    @Param('pledgeId') pledgeId: string,
    @Body() dto: RecordPaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const tenant = this.requireTenant();
    const actor = await this.requireActor();
    if (!idempotencyKey) throw new BadRequestException('Idempotency-Key header is required');
    const payment = await this.giving.recordPayment({
      tenantId: tenant.id,
      pledgeId,
      actorUserId: actor.id,
      ...dto,
      idempotencyKey,
    });
    await this.audit.record({
      action: 'DONATION_PAYMENT_RECORDED',
      entity: 'DonationPayment',
      entityId: payment.id,
      metadata: { pledgeId, amountPaise: payment.amountPaise, method: payment.method, status: payment.status },
    });
    return payment;
  }

  @Post('payments/:paymentId/approve')
  @RequirePermission('finance.approve')
  async approvePayment(@Param('paymentId') paymentId: string) {
    const tenant = this.requireTenant();
    const actor = await this.requireActor();
    const payment = await this.giving.approvePayment(tenant.id, paymentId, actor.id);
    await this.audit.record({
      action: 'DONATION_PAYMENT_VERIFIED',
      entity: 'DonationPayment',
      entityId: payment.id,
      metadata: { pledgeId: payment.pledgeId, amountPaise: payment.amountPaise, status: payment.status },
    });
    return payment;
  }

  @Post('payments/:paymentId/reject')
  @RequirePermission('finance.approve')
  async rejectPayment(
    @Param('paymentId') paymentId: string,
    @Body() dto: RejectPaymentDto,
  ) {
    const tenant = this.requireTenant();
    const actor = await this.requireActor();
    const payment = await this.giving.rejectPayment(tenant.id, paymentId, actor.id, dto.reason);
    await this.audit.record({
      action: 'DONATION_PAYMENT_REJECTED',
      entity: 'DonationPayment',
      entityId: payment.id,
      metadata: { pledgeId: payment.pledgeId, reason: dto.reason, status: payment.status },
    });
    return payment;
  }

  @Get('payments')
  @RequirePermission('finance.read')
  async listTenantPayments() {
    const tenant = this.requireTenant();
    return this.giving.listTenantPayments(tenant.id);
  }

  @Post('expenses')
  @RequirePermission('finance.write')
  async createExpense(@Body() dto: CreateExpenseDto, @Headers('idempotency-key') idempotencyKey?: string) {
    const tenant = this.requireTenant(); const actor = await this.requireActor();
    if (!idempotencyKey) throw new BadRequestException('Idempotency-Key header is required');
    const expense = await this.giving.createExpense({ tenantId: tenant.id, actorUserId: actor.id, ...dto, idempotencyKey });
    await this.audit.record({ action: 'DONATION_EXPENSE_RECORDED', entity: 'DonationExpense', entityId: expense.id,
      metadata: { category: expense.category, amountPaise: expense.amountPaise, status: expense.status } });
    return expense;
  }

  @Get('expenses')
  @RequirePermission('finance.read')
  async listTenantExpenses() { return this.giving.listTenantExpenses(this.requireTenant().id); }

  @Post('expenses/:expenseId/approve')
  @RequirePermission('finance.approve')
  async approveExpense(@Param('expenseId') expenseId: string) {
    const tenant = this.requireTenant(); const actor = await this.requireActor();
    const expense = await this.giving.approveExpense(tenant.id, expenseId, actor.id);
    await this.audit.record({ action: 'DONATION_EXPENSE_APPROVED', entity: 'DonationExpense', entityId: expense.id,
      metadata: { amountPaise: expense.amountPaise, status: expense.status } });
    return expense;
  }

  @Post('expenses/:expenseId/reject')
  @RequirePermission('finance.approve')
  async rejectExpense(@Param('expenseId') expenseId: string, @Body() dto: RejectExpenseDto) {
    const tenant = this.requireTenant(); const actor = await this.requireActor();
    const expense = await this.giving.rejectExpense(tenant.id, expenseId, actor.id, dto.reason);
    await this.audit.record({ action: 'DONATION_EXPENSE_REJECTED', entity: 'DonationExpense', entityId: expense.id,
      metadata: { reason: dto.reason, amountPaise: expense.amountPaise, status: expense.status } });
    return expense;
  }

  @Post('payments/:paymentId/adjustments')
  @RequirePermission('finance.write')
  async createAdjustment(
    @Param('paymentId') paymentId: string,
    @Body() dto: CreateDonationAdjustmentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const tenant = this.requireTenant();
    const actor = await this.requireActor();
    if (!idempotencyKey) throw new BadRequestException('Idempotency-Key header is required');
    const adjustment = await this.giving.createAdjustment({
      tenantId: tenant.id, paymentId, actorUserId: actor.id, ...dto, idempotencyKey,
    });
    await this.audit.record({
      action: 'DONATION_ADJUSTMENT_REQUESTED',
      entity: 'DonationAdjustment',
      entityId: adjustment.id,
      metadata: { paymentId, kind: adjustment.kind, amountPaise: adjustment.amountPaise, status: adjustment.status },
    });
    return adjustment;
  }

  @Get('adjustments')
  @RequirePermission('finance.read')
  async listTenantAdjustments() {
    return this.giving.listTenantAdjustments(this.requireTenant().id);
  }

  @Post('adjustments/:adjustmentId/approve')
  @RequirePermission('finance.approve')
  async approveAdjustment(@Param('adjustmentId') adjustmentId: string) {
    const tenant = this.requireTenant();
    const actor = await this.requireActor();
    const adjustment = await this.giving.approveAdjustment(tenant.id, adjustmentId, actor.id);
    await this.audit.record({
      action: 'DONATION_ADJUSTMENT_APPROVED',
      entity: 'DonationAdjustment',
      entityId: adjustment.id,
      metadata: { paymentId: adjustment.paymentId, kind: adjustment.kind, amountPaise: adjustment.amountPaise, adjustmentNumber: adjustment.adjustmentNumber },
    });
    return adjustment;
  }

  @Post('adjustments/:adjustmentId/reject')
  @RequirePermission('finance.approve')
  async rejectAdjustment(@Param('adjustmentId') adjustmentId: string, @Body() dto: RejectExpenseDto) {
    const tenant = this.requireTenant();
    const actor = await this.requireActor();
    const adjustment = await this.giving.rejectAdjustment(tenant.id, adjustmentId, actor.id, dto.reason);
    await this.audit.record({
      action: 'DONATION_ADJUSTMENT_REJECTED',
      entity: 'DonationAdjustment',
      entityId: adjustment.id,
      metadata: { paymentId: adjustment.paymentId, kind: adjustment.kind, amountPaise: adjustment.amountPaise, reason: dto.reason },
    });
    return adjustment;
  }

  @Get('reports/reconciliation')
  @RequirePermission('finance.read')
  async reconciliationReport() { return this.giving.getReconciliationReport(this.requireTenant().id); }

  @Get('receipts')
  @RequirePermission('finance.read')
  async listTenantReceipts() {
    const tenant = this.requireTenant();
    return this.giving.listTenantReceipts(tenant.id);
  }

  @Get('my-receipts')
  async listMyReceipts() {
    const tenant = this.requireTenant();
    const actor = await this.requireActor();
    return this.giving.listMyReceipts(tenant.id, actor.id);
  }

  @Get('reports/summary')
  @RequirePermission('finance.read')
  async financeReport() {
    const tenant = this.requireTenant();
    return this.giving.getFinanceReport(tenant.id);
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
