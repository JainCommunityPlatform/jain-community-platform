import { ConfigService } from '@nestjs/config';
import { deleteApp, getApps } from 'firebase-admin/app';
import { FirestoreService } from './firestore.service';

describe('FirestoreService against the Firestore emulator', () => {
  const tenantId = 'emulator-tenant-giving-flow';
  let service: FirestoreService;

  beforeAll(() => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('FIRESTORE_EMULATOR_HOST must point to the local Firestore emulator');
    }
    process.env.NODE_ENV = 'test';
    service = new FirestoreService(new ConfigService({
      firebase: { projectId: 'demo-jcp', databaseId: '(default)' },
    }));
  });

  afterAll(async () => {
    const app = getApps().find((candidate) => candidate.name === '[DEFAULT]');
    if (app) await deleteApp(app);
  });

  it('persists partial payments, updates the pledge and issues distinct receipts transactionally', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const donor = await service.upsertUser({ subject: `emulator-donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId, actorUserId: `finance-admin-${suffix}`, name: 'Emulator repair campaign',
    });
    await service.updateGivingCampaignStatus(tenantId, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 100000, idempotencyKey: `pledge-${suffix}`,
    });
    const first = await service.recordDonationPayment({
      tenantId, pledgeId: pledge.id, actorUserId: `cashier-a-${suffix}`,
      amountPaise: 60000, method: 'UPI', idempotencyKey: `payment-a-${suffix}`,
    });
    const second = await service.recordDonationPayment({
      tenantId, pledgeId: pledge.id, actorUserId: `cashier-b-${suffix}`,
      amountPaise: 40000, method: 'BANK_TRANSFER', idempotencyKey: `payment-b-${suffix}`,
    });

    await service.approveDonationPayment(tenantId, first.id, `approver-a-${suffix}`);
    const intermediate = (await service.listDonationPledgesForTenant(tenantId))
      .find((item) => item.id === pledge.id);
    expect(intermediate).toMatchObject({ paidAmountPaise: 60000, status: 'PARTIALLY_PAID' });

    await service.approveDonationPayment(tenantId, second.id, `approver-b-${suffix}`);
    const finalPledge = (await service.listDonationPledgesForTenant(tenantId))
      .find((item) => item.id === pledge.id);
    const receipts = (await service.listDonationReceiptsForTenant(tenantId))
      .filter((receipt) => receipt.pledgeId === pledge.id);

    expect(finalPledge).toMatchObject({ paidAmountPaise: 100000, status: 'PAID' });
    expect(receipts).toHaveLength(2);
    expect(new Set(receipts.map((receipt) => receipt.paymentId)).size).toBe(2);
    expect(new Set(receipts.map((receipt) => receipt.receiptNumber)).size).toBe(2);
  });

  it('rejects overpayment and replayed approval without changing the persisted balance or receipts', async () => {
    const suffix = `emulator-overpay-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Emulator overpayment campaign',
    });
    await service.updateGivingCampaignStatus(tenantId, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 100000, idempotencyKey: `pledge-${suffix}`,
    });
    const firstInput = {
      tenantId, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
      amountPaise: 60000, method: 'UPI' as const, idempotencyKey: `payment-first-${suffix}`,
    };
    const first = await service.recordDonationPayment(firstInput);
    const replayedRecord = await service.recordDonationPayment(firstInput);
    expect(replayedRecord.id).toBe(first.id);

    const second = await service.recordDonationPayment({
      tenantId, pledgeId: pledge.id, actorUserId: `cashier-second-${suffix}`,
      amountPaise: 50000, method: 'BANK_TRANSFER', idempotencyKey: `payment-second-${suffix}`,
    });

    await service.approveDonationPayment(tenantId, first.id, `approver-${suffix}`);
    await expect(service.approveDonationPayment(tenantId, second.id, `approver-second-${suffix}`))
      .rejects.toThrow('PAYMENT_EXCEEDS_BALANCE');
    await expect(service.approveDonationPayment(tenantId, first.id, `approver-replay-${suffix}`))
      .rejects.toThrow('PAYMENT_NOT_PENDING');

    const persistedPledge = (await service.listDonationPledgesForTenant(tenantId))
      .find((item) => item.id === pledge.id);
    const receipts = (await service.listDonationReceiptsForTenant(tenantId))
      .filter((receipt) => receipt.pledgeId === pledge.id);
    expect(persistedPledge).toMatchObject({ paidAmountPaise: 60000, status: 'PARTIALLY_PAID' });
    expect(receipts).toHaveLength(1);
    expect(receipts[0].paymentId).toBe(first.id);
  });


  it('allows only one concurrent approval when two payments would overpay a pledge', async () => {
    const suffix = `emulator-race-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Emulator concurrent approval campaign',
    });
    await service.updateGivingCampaignStatus(tenantId, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 100000, idempotencyKey: `pledge-${suffix}`,
    });
    const first = await service.recordDonationPayment({
      tenantId, pledgeId: pledge.id, actorUserId: `cashier-a-${suffix}`,
      amountPaise: 60000, method: 'UPI', idempotencyKey: `payment-a-${suffix}`,
    });
    const second = await service.recordDonationPayment({
      tenantId, pledgeId: pledge.id, actorUserId: `cashier-b-${suffix}`,
      amountPaise: 60000, method: 'BANK_TRANSFER', idempotencyKey: `payment-b-${suffix}`,
    });

    const outcomes = await Promise.allSettled([
      service.approveDonationPayment(tenantId, first.id, `approver-a-${suffix}`),
      service.approveDonationPayment(tenantId, second.id, `approver-b-${suffix}`),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
    expect(rejected).toBeDefined();
    if (rejected?.status === 'rejected') {
      expect(String(rejected.reason?.message ?? rejected.reason)).toContain('PAYMENT_EXCEEDS_BALANCE');
    }

    const persistedPledge = (await service.listDonationPledgesForTenant(tenantId))
      .find((item) => item.id === pledge.id);
    const receipts = (await service.listDonationReceiptsForTenant(tenantId))
      .filter((receipt) => receipt.pledgeId === pledge.id);
    expect(persistedPledge).toMatchObject({ paidAmountPaise: 60000, status: 'PARTIALLY_PAID' });
    expect(receipts).toHaveLength(1);
  });


  it('allocates unique receipt numbers when separate pledges are approved concurrently', async () => {
    const suffix = `emulator-receipt-race-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Emulator receipt sequence campaign',
    });
    await service.updateGivingCampaignStatus(tenantId, campaign.id, 'ACTIVE');

    const firstPledge = await service.createDonationPledge({
      tenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 50000, idempotencyKey: `pledge-a-${suffix}`,
    });
    const secondPledge = await service.createDonationPledge({
      tenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 50000, idempotencyKey: `pledge-b-${suffix}`,
    });
    const firstPayment = await service.recordDonationPayment({
      tenantId, pledgeId: firstPledge.id, actorUserId: `cashier-a-${suffix}`,
      amountPaise: 50000, method: 'UPI', idempotencyKey: `payment-a-${suffix}`,
    });
    const secondPayment = await service.recordDonationPayment({
      tenantId, pledgeId: secondPledge.id, actorUserId: `cashier-b-${suffix}`,
      amountPaise: 50000, method: 'BANK_TRANSFER', idempotencyKey: `payment-b-${suffix}`,
    });

    const outcomes = await Promise.allSettled([
      service.approveDonationPayment(tenantId, firstPayment.id, `approver-a-${suffix}`),
      service.approveDonationPayment(tenantId, secondPayment.id, `approver-b-${suffix}`),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(2);

    const receipts = (await service.listDonationReceiptsForTenant(tenantId))
      .filter((receipt) => [firstPayment.id, secondPayment.id].includes(receipt.paymentId));
    expect(receipts).toHaveLength(2);
    expect(new Set(receipts.map((receipt) => receipt.receiptNumber)).size).toBe(2);
    expect(new Set(receipts.map((receipt) => receipt.paymentId)).size).toBe(2);
    expect(receipts.every((receipt) => /^JCP-/.test(receipt.receiptNumber))).toBe(true);
  });

});
