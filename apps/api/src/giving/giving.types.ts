export type GivingCampaignStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export type DonationStatus = 'PLEDGED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';

export interface GivingCampaign {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  targetAmountPaise?: number;
  currency: 'INR';
  status: GivingCampaignStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DonationPledge {
  id: string;
  tenantId: string;
  campaignId: string;
  donorUserId: string;
  pledgedAmountPaise: number;
  paidAmountPaise: number;
  currency: 'INR';
  status: DonationStatus;
  createdAt: Date;
  updatedAt: Date;
}
