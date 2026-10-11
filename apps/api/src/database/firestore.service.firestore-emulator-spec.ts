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
    const isolatedTenantId = `${tenantId}-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: isolatedTenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Emulator overpayment campaign',
    });
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: isolatedTenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 100000, idempotencyKey: `pledge-${suffix}`,
    });
    const firstInput = {
      tenantId: isolatedTenantId, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
      amountPaise: 60000, method: 'UPI' as const, idempotencyKey: `payment-first-${suffix}`,
    };
    const first = await service.recordDonationPayment(firstInput);
    const replayedRecord = await service.recordDonationPayment(firstInput);
    expect(replayedRecord.id).toBe(first.id);

    const second = await service.recordDonationPayment({
      tenantId: isolatedTenantId, pledgeId: pledge.id, actorUserId: `cashier-second-${suffix}`,
      amountPaise: 50000, method: 'BANK_TRANSFER', idempotencyKey: `payment-second-${suffix}`,
    });

    await service.approveDonationPayment(isolatedTenantId, first.id, `approver-${suffix}`);
    await expect(service.approveDonationPayment(isolatedTenantId, second.id, `approver-second-${suffix}`))
      .rejects.toThrow('PAYMENT_EXCEEDS_BALANCE');
    await expect(service.approveDonationPayment(isolatedTenantId, first.id, `approver-replay-${suffix}`))
      .rejects.toThrow('PAYMENT_NOT_PENDING');

    const persistedPledge = (await service.listDonationPledgesForTenant(isolatedTenantId))
      .find((item) => item.id === pledge.id);
    const receipts = (await service.listDonationReceiptsForTenant(isolatedTenantId))
      .filter((receipt) => receipt.pledgeId === pledge.id);
    expect(persistedPledge).toMatchObject({ paidAmountPaise: 60000, status: 'PARTIALLY_PAID' });
    expect(receipts).toHaveLength(1);
    expect(receipts[0].paymentId).toBe(first.id);

    const persistedPayments = await service.listDonationPaymentsForTenant(isolatedTenantId);
    expect(persistedPayments.find((payment) => payment.id === second.id))
      .toMatchObject({ status: 'PENDING_APPROVAL', receiptNumber: undefined });
    const reconciliation = await service.getDonationReconciliationReport(isolatedTenantId);
    expect(reconciliation.receipts).toMatchObject({
      issuedReceiptCount: 1,
      missingReceiptPaymentIds: [],
      orphanReceiptPaymentIds: [],
      amountMismatchPaymentIds: [],
      isBalanced: true,
    });
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

  it('rejects payment idempotency-key reuse when the original note differs and preserves the original pending payment', async () => {
    const suffix = `emulator-idempotency-conflict-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: isolatedTenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Emulator idempotency campaign',
    });
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: isolatedTenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 50000, idempotencyKey: `pledge-${suffix}`,
    });
    const input = {
      tenantId: isolatedTenantId, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
      amountPaise: 25000, method: 'UPI' as const, reference: 'UPI-REF-1',
      note: 'Original counter note', idempotencyKey: `payment-${suffix}`,
    };
    const first = await service.recordDonationPayment(input);
    await expect(service.recordDonationPayment({ ...input, note: 'Changed note on replay' }))
      .rejects.toThrow('PAYMENT_IDEMPOTENCY_CONFLICT');

    const payments = await service.listDonationPaymentsForTenant(isolatedTenantId);
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({
      id: first.id, amountPaise: 25000, method: 'UPI',
      note: 'Original counter note', status: 'PENDING_APPROVAL',
    });
    expect((await service.listDonationReceiptsForTenant(isolatedTenantId))).toHaveLength(0);
    expect((await service.listDonationPledgesForTenant(isolatedTenantId)).find((item) => item.id === pledge.id))
      .toMatchObject({ paidAmountPaise: 0, status: 'PLEDGED' });
  });

  it('denies persisted self-approval without consuming a receipt number or changing the pledge', async () => {
    const suffix = `emulator-self-approval-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: isolatedTenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Emulator self-approval campaign',
    });
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: isolatedTenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 50000, idempotencyKey: `pledge-${suffix}`,
    });
    const payment = await service.recordDonationPayment({
      tenantId: isolatedTenantId, pledgeId: pledge.id, actorUserId: `maker-${suffix}`,
      amountPaise: 50000, method: 'CASH', idempotencyKey: `payment-${suffix}`,
    });

    await expect(service.approveDonationPayment(isolatedTenantId, payment.id, `maker-${suffix}`))
      .rejects.toThrow('PAYMENT_SELF_APPROVAL');
    const pending = (await service.listDonationPaymentsForTenant(isolatedTenantId))
      .find((item) => item.id === payment.id);
    expect(pending).toMatchObject({ status: 'PENDING_APPROVAL', receiptNumber: undefined });
    expect(await service.listDonationReceiptsForTenant(isolatedTenantId)).toHaveLength(0);
    expect((await service.listDonationPledgesForTenant(isolatedTenantId)).find((item) => item.id === pledge.id))
      .toMatchObject({ paidAmountPaise: 0, status: 'PLEDGED' });

    const approved = await service.approveDonationPayment(isolatedTenantId, payment.id, `independent-approver-${suffix}`);
    expect(approved.status).toBe('VERIFIED');
    expect(approved.receiptNumber).toMatch(/-000001$/);
    expect(await service.listDonationReceiptsForTenant(isolatedTenantId)).toHaveLength(1);
  });

  it('keeps pledge, payment and receipt queries isolated between tenants in persisted Firestore data', async () => {
    const suffix = `emulator-tenant-isolation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tenantA = `${tenantId}-a-${suffix}`;
    const tenantB = `${tenantId}-b-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const createApprovedPayment = async (targetTenant: string, label: string) => {
      const campaign = await service.createGivingCampaign({
        tenantId: targetTenant, actorUserId: `campaign-admin-${label}`, name: `Campaign ${label}`,
      });
      await service.updateGivingCampaignStatus(targetTenant, campaign.id, 'ACTIVE');
      const pledge = await service.createDonationPledge({
        tenantId: targetTenant, donorUserId: donor.id, campaignId: campaign.id,
        pledgedAmountPaise: 30000, idempotencyKey: `pledge-${label}`,
      });
      const payment = await service.recordDonationPayment({
        tenantId: targetTenant, pledgeId: pledge.id, actorUserId: `cashier-${label}`,
        amountPaise: 30000, method: 'UPI', idempotencyKey: `payment-${label}`,
      });
      await service.approveDonationPayment(targetTenant, payment.id, `approver-${label}`);
      return { pledge, payment };
    };
    const a = await createApprovedPayment(tenantA, `a-${suffix}`);
    const b = await createApprovedPayment(tenantB, `b-${suffix}`);

    expect((await service.listDonationPledgesForTenant(tenantA)).map((item) => item.id))
      .toEqual([a.pledge.id]);
    expect((await service.listDonationPaymentsForTenant(tenantA)).map((item) => item.id))
      .toEqual([a.payment.id]);
    expect((await service.listDonationReceiptsForTenant(tenantA)).map((item) => item.paymentId))
      .toEqual([a.payment.id]);
    expect((await service.listDonationPledgesForTenant(tenantB)).map((item) => item.id))
      .toEqual([b.pledge.id]);
    expect((await service.listDonationPaymentsForTenant(tenantB)).map((item) => item.id))
      .toEqual([b.payment.id]);
    expect((await service.listDonationReceiptsForTenant(tenantB)).map((item) => item.paymentId))
      .toEqual([b.payment.id]);
  });

  it('rejects pledge idempotency-key reuse with a changed amount and preserves the original pledge', async () => {
    const suffix = `emulator-pledge-idempotency-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: isolatedTenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Pledge replay campaign',
    });
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'ACTIVE');
    const input = {
      tenantId: isolatedTenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 50000, idempotencyKey: `pledge-${suffix}`,
    };
    const original = await service.createDonationPledge(input);
    const replay = await service.createDonationPledge(input);
    expect(replay.id).toBe(original.id);
    await expect(service.createDonationPledge({ ...input, pledgedAmountPaise: 75000 }))
      .rejects.toThrow('IDEMPOTENCY_CONFLICT');

    const persisted = await service.listDonationPledgesForTenant(isolatedTenantId);
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({
      id: original.id, pledgedAmountPaise: 50000, paidAmountPaise: 0, status: 'PLEDGED',
    });
    expect(await service.listDonationPaymentsForTenant(isolatedTenantId)).toHaveLength(0);
    expect(await service.listDonationReceiptsForTenant(isolatedTenantId)).toHaveLength(0);
  });

  it('does not allow another tenant to approve a persisted payment or mutate its financial state', async () => {
    const suffix = `emulator-cross-tenant-approval-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ownerTenant = `${tenantId}-owner-${suffix}`;
    const foreignTenant = `${tenantId}-foreign-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: ownerTenant, actorUserId: `campaign-admin-${suffix}`, name: 'Owner tenant campaign',
    });
    await service.updateGivingCampaignStatus(ownerTenant, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: ownerTenant, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 40000, idempotencyKey: `pledge-${suffix}`,
    });
    const payment = await service.recordDonationPayment({
      tenantId: ownerTenant, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
      amountPaise: 20000, method: 'UPI', idempotencyKey: `payment-${suffix}`,
    });

    await expect(service.approveDonationPayment(foreignTenant, payment.id, `foreign-approver-${suffix}`))
      .rejects.toThrow('PAYMENT_NOT_FOUND');

    expect((await service.listDonationPaymentsForTenant(ownerTenant)).find((item) => item.id === payment.id))
      .toMatchObject({ status: 'PENDING_APPROVAL', receiptNumber: undefined });
    expect((await service.listDonationPledgesForTenant(ownerTenant)).find((item) => item.id === pledge.id))
      .toMatchObject({ paidAmountPaise: 0, status: 'PLEDGED' });
    expect(await service.listDonationReceiptsForTenant(ownerTenant)).toHaveLength(0);
    expect(await service.listDonationPaymentsForTenant(foreignTenant)).toHaveLength(0);
    expect(await service.listDonationReceiptsForTenant(foreignTenant)).toHaveLength(0);
  });

  it('rejects recording a payment against another tenant pledge without creating a payment', async () => {
    const suffix = `emulator-cross-tenant-record-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ownerTenant = `${tenantId}-pledge-owner-${suffix}`;
    const foreignTenant = `${tenantId}-payment-foreign-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: ownerTenant, actorUserId: `campaign-admin-${suffix}`, name: 'Pledge owner campaign',
    });
    await service.updateGivingCampaignStatus(ownerTenant, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: ownerTenant, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 40000, idempotencyKey: `pledge-${suffix}`,
    });

    await expect(service.recordDonationPayment({
      tenantId: foreignTenant, pledgeId: pledge.id, actorUserId: `foreign-cashier-${suffix}`,
      amountPaise: 20000, method: 'CASH', idempotencyKey: `payment-${suffix}`,
    })).rejects.toThrow('PLEDGE_NOT_FOUND');

    expect(await service.listDonationPaymentsForTenant(foreignTenant)).toHaveLength(0);
    expect(await service.listDonationReceiptsForTenant(foreignTenant)).toHaveLength(0);
    expect((await service.listDonationPledgesForTenant(ownerTenant)).find((item) => item.id === pledge.id))
      .toMatchObject({ paidAmountPaise: 0, status: 'PLEDGED' });
  });

  it('rejects invalid payment amounts without persisting payments or receipts', async () => {
    const suffix = `emulator-invalid-payment-amount-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: isolatedTenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Invalid amount campaign',
    });
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: isolatedTenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 50000, idempotencyKey: `pledge-${suffix}`,
    });

    for (const [index, amountPaise] of [0, -1, 1.5].entries()) {
      await expect(service.recordDonationPayment({
        tenantId: isolatedTenantId, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
        amountPaise, method: 'UPI', idempotencyKey: `invalid-payment-${index}-${suffix}`,
      })).rejects.toThrow('PAYMENT_AMOUNT_INVALID');
    }

    expect(await service.listDonationPaymentsForTenant(isolatedTenantId)).toHaveLength(0);
    expect(await service.listDonationReceiptsForTenant(isolatedTenantId)).toHaveLength(0);
    expect((await service.listDonationPledgesForTenant(isolatedTenantId)).find((item) => item.id === pledge.id))
      .toMatchObject({ paidAmountPaise: 0, status: 'PLEDGED' });
  });

  it('rejects new pledges against a closed campaign without creating financial records', async () => {
    const suffix = `emulator-closed-campaign-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: isolatedTenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Closed campaign',
    });
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'ACTIVE');
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'CLOSED');

    await expect(service.createDonationPledge({
      tenantId: isolatedTenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 50000, idempotencyKey: `pledge-${suffix}`,
    })).rejects.toThrow('CAMPAIGN_NOT_FOUND');

    expect(await service.listDonationPledgesForTenant(isolatedTenantId)).toHaveLength(0);
    expect(await service.listDonationPaymentsForTenant(isolatedTenantId)).toHaveLength(0);
    expect(await service.listDonationReceiptsForTenant(isolatedTenantId)).toHaveLength(0);
    expect((await service.listGivingCampaigns(isolatedTenantId, true)).find((item) => item.id === campaign.id)?.status)
      .toBe('CLOSED');
  });

  it('keeps rejection atomic and does not consume the next receipt sequence', async () => {
    const suffix = `emulator-rejection-sequence-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: isolatedTenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Payment rejection campaign',
    });
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: isolatedTenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 50000, idempotencyKey: `pledge-${suffix}`,
    });
    const rejectedPayment = await service.recordDonationPayment({
      tenantId: isolatedTenantId, pledgeId: pledge.id, actorUserId: `cashier-reject-${suffix}`,
      amountPaise: 20000, method: 'CASH', idempotencyKey: `payment-reject-${suffix}`,
    });

    const rejected = await service.rejectDonationPayment(
      isolatedTenantId, rejectedPayment.id, `independent-reviewer-${suffix}`, '  Missing supporting evidence  ',
    );
    expect(rejected).toMatchObject({
      status: 'REJECTED', approvedBy: `independent-reviewer-${suffix}`,
      rejectionReason: 'Missing supporting evidence',
    });
    await expect(service.approveDonationPayment(isolatedTenantId, rejectedPayment.id, `second-reviewer-${suffix}`))
      .rejects.toThrow('PAYMENT_NOT_PENDING');

    expect((await service.listDonationPledgesForTenant(isolatedTenantId)).find((item) => item.id === pledge.id))
      .toMatchObject({ paidAmountPaise: 0, status: 'PLEDGED' });
    expect(await service.listDonationReceiptsForTenant(isolatedTenantId)).toHaveLength(0);

    const acceptedPayment = await service.recordDonationPayment({
      tenantId: isolatedTenantId, pledgeId: pledge.id, actorUserId: `cashier-accept-${suffix}`,
      amountPaise: 50000, method: 'UPI', idempotencyKey: `payment-accept-${suffix}`,
    });
    const approved = await service.approveDonationPayment(
      isolatedTenantId, acceptedPayment.id, `independent-approver-${suffix}`,
    );
    expect(approved.status).toBe('VERIFIED');
    expect(approved.receiptNumber).toMatch(/-000001$/);

    const persistedPayments = await service.listDonationPaymentsForTenant(isolatedTenantId);
    expect(persistedPayments.find((item) => item.id === rejectedPayment.id)?.status).toBe('REJECTED');
    expect(persistedPayments.find((item) => item.id === acceptedPayment.id)?.status).toBe('VERIFIED');
    const receipts = await service.listDonationReceiptsForTenant(isolatedTenantId);
    expect(receipts).toHaveLength(1);
    expect(receipts[0].paymentId).toBe(acceptedPayment.id);
  });

});
