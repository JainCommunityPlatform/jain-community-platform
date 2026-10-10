import { ConflictException, ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { GivingService } from './giving.service';

describe('GivingService', () => {
  const firestore = {
    createGivingCampaign: jest.fn(),
    updateGivingCampaignStatus: jest.fn(),
    listGivingCampaigns: jest.fn(),
    createDonationPledge: jest.fn(),
    listDonationPledgesForDonor: jest.fn(),
    listDonationPledgesForTenant: jest.fn(),
    recordDonationPayment: jest.fn(),
    approveDonationPayment: jest.fn(),
    rejectDonationPayment: jest.fn(),
    listDonationPaymentsForTenant: jest.fn(),
    listDonationReceiptsForTenant: jest.fn(),
    listDonationReceiptsForDonor: jest.fn(),
    getDonationFinanceReport: jest.fn(),
    createDonationExpense: jest.fn(), approveDonationExpense: jest.fn(), rejectDonationExpense: jest.fn(), listDonationExpensesForTenant: jest.fn(), getDonationReconciliationReport: jest.fn(),
  };
  const service = () => new GivingService(firestore as never);

  beforeEach(() => jest.clearAllMocks());

  it('exposes receipts and finance summaries through tenant-scoped persistence methods', async () => {
    firestore.listDonationReceiptsForTenant.mockResolvedValue([{ id: 'receipt-1', tenantId: 'tenant-a' }]);
    firestore.listDonationReceiptsForDonor.mockResolvedValue([{ id: 'receipt-2', donorUserId: 'donor-a' }]);
    firestore.getDonationFinanceReport.mockResolvedValue({ tenantId: 'tenant-a', totals: { receivedAmountPaise: 5000 } });
    await expect(service().listTenantReceipts('tenant-a')).resolves.toHaveLength(1);
    await expect(service().listMyReceipts('tenant-a', 'donor-a')).resolves.toMatchObject([{ donorUserId: 'donor-a' }]);
    await expect(service().getFinanceReport('tenant-a')).resolves.toMatchObject({ totals: { receivedAmountPaise: 5000 } });
    expect(firestore.listDonationReceiptsForDonor).toHaveBeenCalledWith('tenant-a', 'donor-a');
    expect(firestore.getDonationFinanceReport).toHaveBeenCalledWith('tenant-a');
  });

  it('maps expense idempotency conflicts and maker-checker failures', async () => {
    firestore.createDonationExpense.mockRejectedValue(new Error('EXPENSE_IDEMPOTENCY_CONFLICT'));
    await expect(service().createExpense({ tenantId: 'tenant-a', actorUserId: 'maker', category: 'Repairs',
      description: 'Repair', amountPaise: 1000, idempotencyKey: 'same-key' })).rejects.toBeInstanceOf(ConflictException);
    firestore.approveDonationExpense.mockRejectedValue(new Error('EXPENSE_SELF_APPROVAL'));
    await expect(service().approveExpense('tenant-a', 'expense-a', 'maker')).rejects.toBeInstanceOf(ForbiddenException);
    firestore.getDonationReconciliationReport.mockResolvedValue({ tenantId: 'tenant-a' });
    await expect(service().getReconciliationReport('tenant-a')).resolves.toMatchObject({ tenantId: 'tenant-a' });
  });

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

  it('requires an idempotency key before recording a payment', async () => {
    await expect(service().recordPayment({
      tenantId: 'tenant-a', pledgeId: 'pledge-a', actorUserId: 'operator',
      amountPaise: 10000, method: 'CASH', idempotencyKey: ' ',
    })).rejects.toThrow('Idempotency-Key');
    expect(firestore.recordDonationPayment).not.toHaveBeenCalled();
  });

  it('maps payment self-approval to forbidden', async () => {
    firestore.approveDonationPayment.mockRejectedValue(new Error('PAYMENT_SELF_APPROVAL'));
    await expect(service().approvePayment('tenant-a', 'payment-a', 'operator'))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('maps overpayment approval to conflict', async () => {
    firestore.approveDonationPayment.mockRejectedValue(new Error('PAYMENT_EXCEEDS_BALANCE'));
    await expect(service().approvePayment('tenant-a', 'payment-a', 'approver'))
      .rejects.toBeInstanceOf(ConflictException);
  });

  it('maps payment amount over remaining balance to 422', async () => {
    firestore.recordDonationPayment.mockRejectedValue(new Error('PAYMENT_EXCEEDS_BALANCE'));
    await expect(service().recordPayment({
      tenantId: 'tenant-a', pledgeId: 'pledge-a', actorUserId: 'operator',
      amountPaise: 20000, method: 'UPI', idempotencyKey: 'req-1',
    })).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

});
