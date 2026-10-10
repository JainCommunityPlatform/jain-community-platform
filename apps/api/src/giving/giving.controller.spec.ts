import { GivingController } from './giving.controller';

describe('GivingController', () => {
  const giving = {
    createCampaign: jest.fn(),
    updateCampaignStatus: jest.fn(),
    listPublicCampaigns: jest.fn(),
    createPledge: jest.fn(),
    listMyPledges: jest.fn(),
    listTenantPledges: jest.fn(),
    recordPayment: jest.fn(),
    approvePayment: jest.fn(),
    rejectPayment: jest.fn(),
    listTenantPayments: jest.fn(),
  };
  const tenantContext = { get: jest.fn().mockReturnValue({ id: 'tenant-a' }) };
  const auth = { get: jest.fn().mockReturnValue({ uid: 'auth-user' }) };
  const identity = { resolve: jest.fn().mockResolvedValue({ id: 'user-a' }) };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const controller = () => new GivingController(
    giving as never, tenantContext as never, auth as never, identity as never, audit as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    tenantContext.get.mockReturnValue({ id: 'tenant-a' });
    auth.get.mockReturnValue({ uid: 'auth-user' });
    identity.resolve.mockResolvedValue({ id: 'user-a' });
    audit.record.mockResolvedValue(undefined);
  });

  it('creates a pledge using authenticated global identity and requires an idempotency key', async () => {
    giving.createPledge.mockResolvedValue({ id: 'pledge-1', tenantId: 'tenant-a', donorUserId: 'user-a' });
    await expect(controller().createPledge({ campaignId: 'campaign-1', pledgedAmountPaise: 25000 }, 'req-1'))
      .resolves.toMatchObject({ donorUserId: 'user-a', tenantId: 'tenant-a' });
    expect(giving.createPledge).toHaveBeenCalledWith({
      tenantId: 'tenant-a', donorUserId: 'user-a', campaignId: 'campaign-1',
      pledgedAmountPaise: 25000, idempotencyKey: 'req-1',
    });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'DONATION_PLEDGE_CREATED', entityId: 'pledge-1',
    }));
  });

  it('returns donor history for the current identity and tenant only', async () => {
    giving.listMyPledges.mockResolvedValue([]);
    await controller().listMyPledges();
    expect(giving.listMyPledges).toHaveBeenCalledWith('tenant-a', 'user-a');
  });


  it('records a payment using the authenticated finance operator identity', async () => {
    giving.recordPayment.mockResolvedValue({
      id: 'payment-1', pledgeId: 'pledge-1', tenantId: 'tenant-a',
      amountPaise: 10000, method: 'UPI', status: 'PENDING_APPROVAL',
    });
    await expect(controller().recordPayment('pledge-1', {
      amountPaise: 10000, method: 'UPI', reference: 'UPI-1',
    }, 'payment-key')).resolves.toMatchObject({ id: 'payment-1', status: 'PENDING_APPROVAL' });
    expect(giving.recordPayment).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-a', pledgeId: 'pledge-1', actorUserId: 'user-a',
      amountPaise: 10000, idempotencyKey: 'payment-key',
    }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'DONATION_PAYMENT_RECORDED', entityId: 'payment-1',
    }));
  });

  it('audits a separate approval action', async () => {
    giving.approvePayment.mockResolvedValue({ id: 'payment-1', pledgeId: 'pledge-1', status: 'VERIFIED' });
    await controller().approvePayment('payment-1');
    expect(giving.approvePayment).toHaveBeenCalledWith('tenant-a', 'payment-1', 'user-a');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'DONATION_PAYMENT_VERIFIED', entityId: 'payment-1',
    }));
  });

});
