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
    listTenantReceipts: jest.fn(),
    listMyReceipts: jest.fn(),
    getFinanceReport: jest.fn(),
    createExpense: jest.fn(), listTenantExpenses: jest.fn(), approveExpense: jest.fn(), rejectExpense: jest.fn(), getReconciliationReport: jest.fn(),
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

  it('creates and audits expenses using authenticated actor and resolved tenant', async () => {
    giving.createExpense.mockResolvedValue({ id: 'expense-1', tenantId: 'tenant-a', amountPaise: 5000, status: 'PENDING_APPROVAL' });
    await expect(controller().createExpense({ category: 'Maintenance', description: 'Repair', amountPaise: 5000 }, 'expense-key')).resolves.toMatchObject({ id: 'expense-1' });
    expect(giving.createExpense).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-a', actorUserId: 'user-a', idempotencyKey: 'expense-key' }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DONATION_EXPENSE_RECORDED', entityId: 'expense-1' }));
  });

  it('scopes expense approval and reconciliation to the resolved tenant', async () => {
    giving.approveExpense.mockResolvedValue({ id: 'expense-1', amountPaise: 5000, status: 'APPROVED' });
    giving.getReconciliationReport.mockResolvedValue({ tenantId: 'tenant-a', receipts: { isBalanced: true } });
    await controller().approveExpense('expense-1');
    await controller().reconciliationReport();
    expect(giving.approveExpense).toHaveBeenCalledWith('tenant-a', 'expense-1', 'user-a');
    expect(giving.getReconciliationReport).toHaveBeenCalledWith('tenant-a');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DONATION_EXPENSE_APPROVED', entityId: 'expense-1' }));
  });

  it('restricts donor receipts to the authenticated identity and tenant', async () => {
    giving.listMyReceipts.mockResolvedValue([{ id: 'receipt-1', tenantId: 'tenant-a', donorUserId: 'user-a' }]);
    await expect(controller().listMyReceipts()).resolves.toMatchObject([{ donorUserId: 'user-a' }]);
    expect(giving.listMyReceipts).toHaveBeenCalledWith('tenant-a', 'user-a');
  });

  it('records and audits an adjustment with the authenticated actor and tenant', async () => {
    giving.createAdjustment.mockResolvedValue({ id: 'adjustment-1', paymentId: 'payment-1', kind: 'REFUND', amountPaise: 5000, status: 'PENDING_APPROVAL' });
    await expect(controller().createAdjustment('payment-1', {
      kind: 'REFUND', amountPaise: 5000, reason: 'Duplicate payment',
    }, 'adjustment-key')).resolves.toMatchObject({ id: 'adjustment-1' });
    expect(giving.createAdjustment).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-a', paymentId: 'payment-1', actorUserId: 'user-a', idempotencyKey: 'adjustment-key',
    }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'DONATION_ADJUSTMENT_REQUESTED', entityId: 'adjustment-1',
    }));
  });

  it('uses the tenant-scoped finance adjustment list and audits review decisions', async () => {
    giving.listTenantAdjustments.mockResolvedValue([]);
    giving.approveAdjustment.mockResolvedValue({ id: 'adjustment-1', paymentId: 'payment-1', kind: 'REVERSAL', amountPaise: 5000, status: 'APPROVED' });
    giving.rejectAdjustment.mockResolvedValue({ id: 'adjustment-2', paymentId: 'payment-1', kind: 'REFUND', amountPaise: 2000, status: 'REJECTED' });
    await controller().listTenantAdjustments();
    await controller().approveAdjustment('adjustment-1');
    await controller().rejectAdjustment('adjustment-2', { reason: 'Evidence incomplete' });
    expect(giving.listTenantAdjustments).toHaveBeenCalledWith('tenant-a');
    expect(giving.approveAdjustment).toHaveBeenCalledWith('tenant-a', 'adjustment-1', 'user-a');
    expect(giving.rejectAdjustment).toHaveBeenCalledWith('tenant-a', 'adjustment-2', 'user-a', 'Evidence incomplete');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DONATION_ADJUSTMENT_APPROVED', entityId: 'adjustment-1' }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DONATION_ADJUSTMENT_REJECTED', entityId: 'adjustment-2' }));
  });

  it('uses the resolved tenant for finance receipts and reports', async () => {
    giving.listTenantReceipts.mockResolvedValue([]);
    giving.getFinanceReport.mockResolvedValue({ tenantId: 'tenant-a', totals: {} });
    await controller().listTenantReceipts();
    await controller().financeReport();
    expect(giving.listTenantReceipts).toHaveBeenCalledWith('tenant-a');
    expect(giving.getFinanceReport).toHaveBeenCalledWith('tenant-a');
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
