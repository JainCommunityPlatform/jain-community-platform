import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
  NotFoundException,
} from '@nestjs/common';

import { FirestoreService } from '../database/firestore.service';
import { GivingCampaignStatus } from './giving.types';

@Injectable()
export class GivingService {
  constructor(private readonly firestore: FirestoreService) {}

  createCampaign(input: {
    tenantId: string;
    actorUserId: string;
    name: string;
    description?: string;
    targetAmountPaise?: number;
  }) {
    return this.firestore.createGivingCampaign(input);
  }

  async updateCampaignStatus(
    tenantId: string,
    campaignId: string,
    status: GivingCampaignStatus,
  ) {
    const campaign = await this.firestore.updateGivingCampaignStatus(
      tenantId,
      campaignId,
      status,
    );
    if (!campaign) throw new NotFoundException('Campaign not found for this tenant');
    return campaign;
  }

  listPublicCampaigns(tenantId: string) {
    return this.firestore.listGivingCampaigns(tenantId, false);
  }

  async createPledge(input: {
    tenantId: string;
    donorUserId: string;
    campaignId: string;
    pledgedAmountPaise: number;
    idempotencyKey: string;
  }) {
    if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 200) {
      throw new BadRequestException('A valid Idempotency-Key header is required');
    }
    try {
      return await this.firestore.createDonationPledge(input);
    } catch (error) {
      if (error instanceof Error && error.message === 'CAMPAIGN_NOT_FOUND') {
        throw new NotFoundException('Active campaign not found for this tenant');
      }
      if (error instanceof Error && error.message === 'IDEMPOTENCY_CONFLICT') {
        throw new ConflictException('Idempotency key was already used for a different pledge');
      }
      if (error instanceof Error && error.message === 'DONOR_INACTIVE') {
        throw new ForbiddenException('This tenant donor relationship is inactive');
      }
      throw error;
    }
  }

  async recordPayment(input: {
    tenantId: string;
    pledgeId: string;
    actorUserId: string;
    amountPaise: number;
    method: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';
    reference?: string;
    note?: string;
    idempotencyKey: string;
  }) {
    if (!input.idempotencyKey.trim() || input.idempotencyKey.length > 200) {
      throw new BadRequestException('A valid Idempotency-Key header is required');
    }
    try {
      return await this.firestore.recordDonationPayment(input);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (error.message === 'PLEDGE_NOT_FOUND') throw new NotFoundException('Pledge not found for this tenant');
      if (error.message === 'PLEDGE_CANCELLED') throw new ConflictException('Cannot record payment against a cancelled pledge');
      if (error.message === 'PAYMENT_EXCEEDS_BALANCE') throw new UnprocessableEntityException('Payment exceeds the remaining pledge balance');
      if (error.message === 'PAYMENT_AMOUNT_INVALID') throw new BadRequestException('Payment amount must be a positive integer in paise');
      if (error.message === 'PAYMENT_IDEMPOTENCY_CONFLICT') throw new ConflictException('Idempotency key was already used for different payment details');
      throw error;
    }
  }

  async approvePayment(tenantId: string, paymentId: string, approverUserId: string) {
    try {
      return await this.firestore.approveDonationPayment(tenantId, paymentId, approverUserId);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (error.message === 'PAYMENT_NOT_FOUND' || error.message === 'PLEDGE_NOT_FOUND') throw new NotFoundException('Payment not found for this tenant');
      if (error.message === 'PAYMENT_SELF_APPROVAL') throw new ForbiddenException('The person who recorded a payment cannot approve it');
      if (error.message === 'PAYMENT_NOT_PENDING') throw new ConflictException('Payment is no longer pending approval');
      if (error.message === 'PAYMENT_EXCEEDS_BALANCE') throw new ConflictException('Approval would exceed the remaining pledge balance');
      if (error.message === 'PLEDGE_CANCELLED') throw new ConflictException('Cannot approve payment against a cancelled pledge');
      throw error;
    }
  }

  async rejectPayment(tenantId: string, paymentId: string, approverUserId: string, reason: string) {
    try {
      return await this.firestore.rejectDonationPayment(tenantId, paymentId, approverUserId, reason);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (error.message === 'PAYMENT_NOT_FOUND') throw new NotFoundException('Payment not found for this tenant');
      if (error.message === 'PAYMENT_SELF_APPROVAL') throw new ForbiddenException('The person who recorded a payment cannot reject it');
      if (error.message === 'PAYMENT_NOT_PENDING') throw new ConflictException('Payment is no longer pending approval');
      throw error;
    }
  }

  listTenantPayments(tenantId: string) {
    return this.firestore.listDonationPaymentsForTenant(tenantId);
  }

  listMyPledges(tenantId: string, donorUserId: string) {
    return this.firestore.listDonationPledgesForDonor(tenantId, donorUserId);
  }

  listTenantPledges(tenantId: string) {
    return this.firestore.listDonationPledgesForTenant(tenantId);
  }
}
