import { ConflictException, NotFoundException } from '@nestjs/common';
import { GivingService } from './giving.service';

describe('GivingService', () => {
  const firestore = {
    createGivingCampaign: jest.fn(),
    updateGivingCampaignStatus: jest.fn(),
    listGivingCampaigns: jest.fn(),
    createDonationPledge: jest.fn(),
    listDonationPledgesForDonor: jest.fn(),
    listDonationPledgesForTenant: jest.fn(),
  };
  const service = () => new GivingService(firestore as never);

  beforeEach(() => jest.clearAllMocks());

  it('requires an idempotency key for pledge creation', async () => {
    await expect(service().createPledge({
      tenantId: 'tenant-a', donorUserId: 'donor-a', campaignId: 'campaign-a',
      pledgedAmountPaise: 10000, idempotencyKey: ' ',
    })).rejects.toThrow('Idempotency-Key');
    expect(firestore.createDonationPledge).not.toHaveBeenCalled();
  });

  it('maps tenant-scoped missing campaigns to 404', async () => {
    firestore.createDonationPledge.mockRejectedValue(new Error('CAMPAIGN_NOT_FOUND'));
    await expect(service().createPledge({
      tenantId: 'tenant-a', donorUserId: 'donor-a', campaignId: 'campaign-b',
      pledgedAmountPaise: 10000, idempotencyKey: 'req-1',
    })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps idempotency conflicts to 409', async () => {
    firestore.createDonationPledge.mockRejectedValue(new Error('IDEMPOTENCY_CONFLICT'));
    await expect(service().createPledge({
      tenantId: 'tenant-a', donorUserId: 'donor-a', campaignId: 'campaign-a',
      pledgedAmountPaise: 10000, idempotencyKey: 'req-1',
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not expose campaigns from another tenant when changing status', async () => {
    firestore.updateGivingCampaignStatus.mockResolvedValue(null);
    await expect(service().updateCampaignStatus('tenant-a', 'campaign-b', 'ACTIVE'))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(firestore.updateGivingCampaignStatus).toHaveBeenCalledWith('tenant-a', 'campaign-b', 'ACTIVE');
  });
});
