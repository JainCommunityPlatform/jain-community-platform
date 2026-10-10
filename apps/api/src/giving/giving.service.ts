import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
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

  listMyPledges(tenantId: string, donorUserId: string) {
    return this.firestore.listDonationPledgesForDonor(tenantId, donorUserId);
  }

  listTenantPledges(tenantId: string) {
    return this.firestore.listDonationPledgesForTenant(tenantId);
  }
}
