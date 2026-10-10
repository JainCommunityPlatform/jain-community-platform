import { PublicGivingController } from './public-giving.controller';

describe('PublicGivingController', () => {
  const giving = { listPublicCampaigns: jest.fn() };
  const tenantContext = { get: jest.fn().mockReturnValue({ id: 'tenant-a' }) };
  const controller = () => new PublicGivingController(giving as never, tenantContext as never);

  beforeEach(() => {
    jest.clearAllMocks();
    tenantContext.get.mockReturnValue({ id: 'tenant-a' });
  });

  it('returns active campaign fields without internal creator identity', async () => {
    giving.listPublicCampaigns.mockResolvedValue([{
      id: 'campaign-a', tenantId: 'tenant-a', name: 'Temple Renovation',
      description: 'Renovation', targetAmountPaise: 100000, currency: 'INR',
      status: 'ACTIVE', createdBy: 'internal-user', createdAt: new Date('2026-10-01T00:00:00Z'),
    }]);
    await expect(controller().listCampaigns()).resolves.toEqual([{
      id: 'campaign-a', name: 'Temple Renovation', description: 'Renovation',
      targetAmountPaise: 100000, currency: 'INR', status: 'ACTIVE',
      createdAt: new Date('2026-10-01T00:00:00Z'),
    }]);
  });

  it('requires resolved tenant context', async () => {
    tenantContext.get.mockReturnValue(null);
    await expect(controller().listCampaigns()).rejects.toThrow('Tenant context is required');
  });
});
