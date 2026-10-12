import { ConfigService } from '@nestjs/config';
import { deleteApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { FirestoreService } from './firestore.service';
import { MembershipService } from '../authorization/membership.service';

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

  it('keeps notification preferences, delivery history and read state isolated by tenant and user', async () => {
    const suffix = `emulator-notification-isolation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tenantA = `${tenantId}-notification-a-${suffix}`;
    const tenantB = `${tenantId}-notification-b-${suffix}`;
    const userA = `notification-user-a-${suffix}`;
    const userB = `notification-user-b-${suffix}`;
    const notificationId = `notification-${suffix}`;

    await service.updateNotificationPreferences({ tenantId: tenantA, userId: userA, email: true, whatsapp: false, push: true });
    await service.updateNotificationPreferences({ tenantId: tenantB, userId: userA, email: false, whatsapp: true, push: false });
    await service.updateNotificationPreferences({ tenantId: tenantA, userId: userB, email: false, whatsapp: false, push: false });

    expect(await service.getNotificationPreferences(tenantA, userA)).toMatchObject({ tenantId: tenantA, userId: userA, email: true, whatsapp: false, push: true });
    expect(await service.getNotificationPreferences(tenantB, userA)).toMatchObject({ tenantId: tenantB, userId: userA, email: false, whatsapp: true, push: false });
    expect(await service.getNotificationPreferences(tenantA, userB)).toMatchObject({ tenantId: tenantA, userId: userB, email: false, whatsapp: false, push: false });

    const now = new Date();
    const notification = {
      tenantId: tenantA, userId: userA, type: 'PAYMENT_VERIFIED',
      title: 'Donation payment verified', body: 'Your receipt is ready.',
      entityType: 'DONATION_PAYMENT', entityId: `payment-${suffix}`,
      metadata: { receiptNumber: `JCP-${suffix}` }, readAt: null, createdAt: now, updatedAt: now,
    };
    await getFirestore().collection('notifications').doc(notificationId).set(notification);
    const secondNotificationId = `notification-newer-${suffix}`;
    await getFirestore().collection('notifications').doc(secondNotificationId).set({
      ...notification, title: 'Receipt available', createdAt: new Date(now.getTime() + 1000),
    });
    await getFirestore().collection('notifications').doc(`notification-other-user-${suffix}`).set({
      ...notification, userId: userB, title: 'Private notification for another user',
    });
    await getFirestore().collection('notifications').doc(`notification-other-tenant-${suffix}`).set({
      ...notification, tenantId: tenantB, title: 'Private notification for another tenant',
    });

    expect(await service.listNotificationsForUser(tenantA, userA, 1)).toMatchObject([
      { id: secondNotificationId, tenantId: tenantA, userId: userA, title: 'Receipt available' },
    ]);
    expect(await service.listNotificationsForUser(tenantA, userA, 1000)).toMatchObject([
      { id: secondNotificationId, title: 'Receipt available' }, { id: notificationId, title: 'Donation payment verified' },
    ]);
    expect(await service.listNotificationsForUser(tenantB, userA)).toMatchObject([
      { id: `notification-other-tenant-${suffix}`, tenantId: tenantB, userId: userA },
    ]);
    expect(await service.listNotificationsForUser(tenantA, userB)).toMatchObject([
      { id: `notification-other-user-${suffix}`, tenantId: tenantA, userId: userB },
    ]);
    expect(await service.listNotificationsForUser(tenantA, `unrelated-${suffix}`)).toHaveLength(0);

    await expect(service.markNotificationRead(tenantB, userA, notificationId)).resolves.toBeNull();
    await expect(service.markNotificationRead(tenantA, userB, notificationId)).resolves.toBeNull();
    const firstRead = await service.markNotificationRead(tenantA, userA, notificationId);
    expect(firstRead).toMatchObject({ id: notificationId, tenantId: tenantA, userId: userA, readAt: expect.any(Date) });
    const originalReadAt = firstRead?.readAt;
    const repeatedRead = await service.markNotificationRead(tenantA, userA, notificationId);
    expect(repeatedRead?.readAt).toEqual(originalReadAt);
    expect(await service.markNotificationRead(tenantA, userA, `missing-${suffix}`)).toBeNull();

    const deliveries = [
      { id: `delivery-email-${suffix}`, channel: 'EMAIL' as const, status: 'SENT' as const, providerMessageId: `email-${suffix}` },
      { id: `delivery-whatsapp-${suffix}`, channel: 'WHATSAPP' as const, status: 'FAILED' as const, errorCode: 'PROVIDER_TIMEOUT', errorMessage: 'Provider timed out' },
      { id: `delivery-push-${suffix}`, channel: 'PUSH' as const, status: 'PENDING' as const },
    ];
    for (const delivery of deliveries) {
      await service.recordNotificationDelivery({ ...delivery, tenantId: tenantA, notificationId, userId: userA });
    }
    await service.recordNotificationDelivery({
      id: `delivery-other-tenant-${suffix}`, tenantId: tenantB, notificationId, userId: userA,
      channel: 'EMAIL', status: 'SENT', providerMessageId: 'other-tenant-message',
    });
    const listedDeliveries = await service.listNotificationDeliveries(tenantA, notificationId);
    expect(listedDeliveries).toMatchObject([
      { id: deliveries[0].id, tenantId: tenantA, notificationId, userId: userA, channel: 'EMAIL', status: 'SENT', attempts: 1, providerMessageId: `email-${suffix}` },
      { id: deliveries[1].id, tenantId: tenantA, notificationId, userId: userA, channel: 'WHATSAPP', status: 'FAILED', attempts: 1, errorCode: 'PROVIDER_TIMEOUT' },
      { id: deliveries[2].id, tenantId: tenantA, notificationId, userId: userA, channel: 'PUSH', status: 'PENDING', attempts: 0 },
    ]);
    expect(listedDeliveries.map((item) => item.id)).not.toContain(`delivery-other-tenant-${suffix}`);

    await service.recordNotificationDelivery({
      id: deliveries[0].id, tenantId: tenantA, notificationId, userId: userA, channel: 'EMAIL', status: 'PROCESSING',
    });
    const retriedDeliveries = await service.listNotificationDeliveries(tenantA, notificationId);
    expect(retriedDeliveries.find((item) => item.id === deliveries[0].id)).toMatchObject({
      attempts: 1, status: 'PROCESSING', providerMessageId: `email-${suffix}`,
    });
    await service.recordNotificationDelivery({
      id: deliveries[0].id, tenantId: tenantA, notificationId, userId: userA, channel: 'EMAIL',
      status: 'FAILED', errorCode: 'SMTP_TEMPORARY',
    });
    const failedDeliveries = await service.listNotificationDeliveries(tenantA, notificationId);
    expect(failedDeliveries.find((item) => item.id === deliveries[0].id)).toMatchObject({
      attempts: 2, status: 'FAILED', providerMessageId: `email-${suffix}`, errorCode: 'SMTP_TEMPORARY',
    });
  });

  it('exposes only active campaigns publicly and scopes campaign visibility to the tenant', async () => {
    const suffix = `emulator-campaign-visibility-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tenantA = `${tenantId}-campaign-a-${suffix}`;
    const tenantB = `${tenantId}-campaign-b-${suffix}`;
    const createCampaign = (targetTenant: string, name: string) =>
      service.createGivingCampaign({ tenantId: targetTenant, actorUserId: `admin-${name}-${suffix}`, name });

    const draft = await createCampaign(tenantA, 'Draft campaign');
    const active = await createCampaign(tenantA, 'Active campaign');
    const closed = await createCampaign(tenantA, 'Closed campaign');
    const foreignActive = await createCampaign(tenantB, 'Other tenant active campaign');
    await service.updateGivingCampaignStatus(tenantA, active.id, 'ACTIVE');
    await service.updateGivingCampaignStatus(tenantA, closed.id, 'ACTIVE');
    await service.updateGivingCampaignStatus(tenantA, closed.id, 'CLOSED');
    await service.updateGivingCampaignStatus(tenantB, foreignActive.id, 'ACTIVE');

    const publicCampaigns = await service.listGivingCampaigns(tenantA);
    expect(publicCampaigns.map((campaign) => campaign.id)).toContain(active.id);
    expect(publicCampaigns.map((campaign) => campaign.id)).not.toContain(draft.id);
    expect(publicCampaigns.map((campaign) => campaign.id)).not.toContain(closed.id);
    expect(publicCampaigns.map((campaign) => campaign.id)).not.toContain(foreignActive.id);
    expect(publicCampaigns).toHaveLength(1);
    expect(publicCampaigns[0]).toMatchObject({
      id: active.id,
      tenantId: tenantA,
      status: 'ACTIVE',
      name: 'Active campaign',
    });

    const tenantCampaigns = await service.listGivingCampaigns(tenantA, true);
    expect(tenantCampaigns.map((campaign) => campaign.id).sort()).toEqual([active.id, closed.id, draft.id].sort());
    expect(tenantCampaigns.map((campaign) => campaign.id)).not.toContain(foreignActive.id);
  });

  it('persists partial payments, updates the pledge and issues distinct receipts transactionally', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-lifecycle-${suffix}`;
    const donor = await service.upsertUser({ subject: `emulator-donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: isolatedTenantId, actorUserId: `finance-admin-${suffix}`, name: 'Emulator repair campaign',
    });
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: isolatedTenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 100000, idempotencyKey: `pledge-${suffix}`,
    });
    const first = await service.recordDonationPayment({
      tenantId: isolatedTenantId, pledgeId: pledge.id, actorUserId: `cashier-a-${suffix}`,
      amountPaise: 60000, method: 'UPI', idempotencyKey: `payment-a-${suffix}`,
    });
    const second = await service.recordDonationPayment({
      tenantId: isolatedTenantId, pledgeId: pledge.id, actorUserId: `cashier-b-${suffix}`,
      amountPaise: 40000, method: 'BANK_TRANSFER', idempotencyKey: `payment-b-${suffix}`,
    });

    await service.approveDonationPayment(isolatedTenantId, first.id, `approver-a-${suffix}`);
    const intermediate = (await service.listDonationPledgesForTenant(isolatedTenantId))
      .find((item) => item.id === pledge.id);
    expect(intermediate).toMatchObject({ paidAmountPaise: 60000, status: 'PARTIALLY_PAID' });

    await service.approveDonationPayment(isolatedTenantId, second.id, `approver-b-${suffix}`);
    const finalPledge = (await service.listDonationPledgesForTenant(isolatedTenantId))
      .find((item) => item.id === pledge.id);
    const receipts = (await service.listDonationReceiptsForTenant(isolatedTenantId))
      .filter((receipt) => receipt.pledgeId === pledge.id);

    expect(finalPledge).toMatchObject({ paidAmountPaise: 100000, status: 'PAID' });
    expect(receipts).toHaveLength(2);
    expect(new Set(receipts.map((receipt) => receipt.paymentId)).size).toBe(2);
    expect(new Set(receipts.map((receipt) => receipt.receiptNumber)).size).toBe(2);

    // Reconcile from persisted payment, pledge and receipt records rather than
    // treating the successful approval responses as proof of financial integrity.
    const persistedPayments = (await service.listDonationPaymentsForTenant(isolatedTenantId))
      .filter((payment) => payment.pledgeId === pledge.id);
    expect(persistedPayments).toHaveLength(2);
    expect(persistedPayments.every((payment) => payment.status === 'VERIFIED')).toBe(true);
    expect(persistedPayments.every((payment) => Boolean(payment.receiptNumber))).toBe(true);

    const reconciliation = await service.getDonationReconciliationReport(isolatedTenantId);
    expect(reconciliation.receipts).toMatchObject({
      issuedReceiptCount: 2,
      missingReceiptPaymentIds: [],
      orphanReceiptPaymentIds: [],
      amountMismatchPaymentIds: [],
      isBalanced: true,
    });

    // Verify the donor-facing history APIs expose the same persisted workflow,
    // not just tenant-wide finance queries.
    const donorPledges = await service.listDonationPledgesForDonor(isolatedTenantId, donor.id);
    const donorReceipts = await service.listDonationReceiptsForDonor(isolatedTenantId, donor.id);
    expect(donorPledges.filter((item) => item.id === pledge.id)).toMatchObject([
      { id: pledge.id, tenantId: isolatedTenantId, donorUserId: donor.id, paidAmountPaise: 100000, status: 'PAID' },
    ]);
    expect(donorReceipts.filter((receipt) => receipt.pledgeId === pledge.id)).toHaveLength(2);
    expect(new Set(donorReceipts.filter((receipt) => receipt.pledgeId === pledge.id).map((receipt) => receipt.paymentId)).size).toBe(2);
    expect(donorReceipts.filter((receipt) => receipt.pledgeId === pledge.id).every((receipt) => receipt.donorUserId === donor.id)).toBe(true);
  });

  it('isolates persisted donor pledge and receipt history by both tenant and donor', async () => {
    const suffix = `emulator-donor-history-isolation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tenantA = `${tenantId}-history-a-${suffix}`;
    const tenantB = `${tenantId}-history-b-${suffix}`;
    const donorA = await service.upsertUser({ subject: `history-donor-a-${suffix}` });
    const donorB = await service.upsertUser({ subject: `history-donor-b-${suffix}` });

    const createPaidPledge = async (targetTenant: string, donorUserId: string, label: string) => {
      const campaign = await service.createGivingCampaign({
        tenantId: targetTenant, actorUserId: `campaign-admin-${label}-${suffix}`, name: `History ${label}`,
      });
      await service.updateGivingCampaignStatus(targetTenant, campaign.id, 'ACTIVE');
      const pledge = await service.createDonationPledge({
        tenantId: targetTenant, donorUserId, campaignId: campaign.id,
        pledgedAmountPaise: 25000, idempotencyKey: `pledge-${label}-${suffix}`,
      });
      const payment = await service.recordDonationPayment({
        tenantId: targetTenant, pledgeId: pledge.id, actorUserId: `cashier-${label}-${suffix}`,
        amountPaise: 25000, method: 'UPI', idempotencyKey: `payment-${label}-${suffix}`,
      });
      await service.approveDonationPayment(targetTenant, payment.id, `approver-${label}-${suffix}`);
      return pledge;
    };

    const targetPledge = await createPaidPledge(tenantA, donorA.id, 'target');
    const sameTenantOtherDonorPledge = await createPaidPledge(tenantA, donorB.id, 'other-donor');
    const otherTenantSameDonorPledge = await createPaidPledge(tenantB, donorA.id, 'other-tenant');

    const donorAPledgesInTenantA = await service.listDonationPledgesForDonor(tenantA, donorA.id);
    const donorAReceiptsInTenantA = await service.listDonationReceiptsForDonor(tenantA, donorA.id);

    expect(donorAPledgesInTenantA.map((item) => item.id)).toEqual([targetPledge.id]);
    expect(donorAReceiptsInTenantA).toHaveLength(1);
    expect(donorAReceiptsInTenantA[0]).toMatchObject({
      tenantId: tenantA, donorUserId: donorA.id, pledgeId: targetPledge.id,
    });
    expect(donorAPledgesInTenantA.map((item) => item.id)).not.toContain(sameTenantOtherDonorPledge.id);
    expect(donorAPledgesInTenantA.map((item) => item.id)).not.toContain(otherTenantSameDonorPledge.id);
    expect(donorAReceiptsInTenantA.some((receipt) => receipt.pledgeId === sameTenantOtherDonorPledge.id)).toBe(false);
    expect(donorAReceiptsInTenantA.some((receipt) => receipt.pledgeId === otherTenantSameDonorPledge.id)).toBe(false);

    expect((await service.listDonationPledgesForDonor(tenantA, donorB.id)).map((item) => item.id))
      .toEqual([sameTenantOtherDonorPledge.id]);
    expect((await service.listDonationPledgesForDonor(tenantB, donorA.id)).map((item) => item.id))
      .toEqual([otherTenantSameDonorPledge.id]);
    expect(await service.listDonationReceiptsForDonor(tenantA, `unknown-donor-${suffix}`)).toHaveLength(0);
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
  }, 30000);


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

    // Donor history must be scoped by both tenant and donor, even when the same
    // donor has giving activity in more than one tenant.
    expect((await service.listDonationPledgesForDonor(tenantA, donor.id)).map((item) => item.id))
      .toEqual([a.pledge.id]);
    expect((await service.listDonationReceiptsForDonor(tenantA, donor.id)).map((item) => item.paymentId))
      .toEqual([a.payment.id]);
    expect((await service.listDonationPledgesForDonor(tenantB, donor.id)).map((item) => item.id))
      .toEqual([b.pledge.id]);
    expect((await service.listDonationReceiptsForDonor(tenantB, donor.id)).map((item) => item.paymentId))
      .toEqual([b.payment.id]);
    expect(await service.listDonationPledgesForDonor(tenantA, 'unrelated-donor')).toEqual([]);
    expect(await service.listDonationReceiptsForDonor(tenantA, 'unrelated-donor')).toEqual([]);
  });

  it('scopes pledge and payment idempotency keys to the tenant in persisted Firestore data', async () => {
    const suffix = `emulator-cross-tenant-idempotency-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tenantA = `${tenantId}-idempotency-a-${suffix}`;
    const tenantB = `${tenantId}-idempotency-b-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const createActiveCampaign = async (targetTenant: string, label: string) => {
      const campaign = await service.createGivingCampaign({
        tenantId: targetTenant, actorUserId: `campaign-admin-${label}`, name: `Campaign ${label}`,
      });
      await service.updateGivingCampaignStatus(targetTenant, campaign.id, 'ACTIVE');
      return campaign;
    };
    const campaignA = await createActiveCampaign(tenantA, `a-${suffix}`);
    const campaignB = await createActiveCampaign(tenantB, `b-${suffix}`);
    const pledgeA = await service.createDonationPledge({
      tenantId: tenantA, donorUserId: donor.id, campaignId: campaignA.id,
      pledgedAmountPaise: 50000, idempotencyKey: `shared-pledge-key-${suffix}`,
    });
    const pledgeB = await service.createDonationPledge({
      tenantId: tenantB, donorUserId: donor.id, campaignId: campaignB.id,
      pledgedAmountPaise: 70000, idempotencyKey: `shared-pledge-key-${suffix}`,
    });

    expect(pledgeA.id).not.toBe(pledgeB.id);
    expect(pledgeA).toMatchObject({ tenantId: tenantA, pledgedAmountPaise: 50000 });
    expect(pledgeB).toMatchObject({ tenantId: tenantB, pledgedAmountPaise: 70000 });

    const paymentA = await service.recordDonationPayment({
      tenantId: tenantA, pledgeId: pledgeA.id, actorUserId: `shared-cashier-${suffix}`,
      amountPaise: 20000, method: 'UPI', idempotencyKey: `shared-payment-key-${suffix}`,
    });
    const paymentB = await service.recordDonationPayment({
      tenantId: tenantB, pledgeId: pledgeB.id, actorUserId: `shared-cashier-${suffix}`,
      amountPaise: 30000, method: 'UPI', idempotencyKey: `shared-payment-key-${suffix}`,
    });

    expect(paymentA.id).not.toBe(paymentB.id);
    expect(paymentA).toMatchObject({ tenantId: tenantA, pledgeId: pledgeA.id, amountPaise: 20000 });
    expect(paymentB).toMatchObject({ tenantId: tenantB, pledgeId: pledgeB.id, amountPaise: 30000 });
    expect((await service.listDonationPledgesForTenant(tenantA)).map((item) => item.id)).toEqual([pledgeA.id]);
    expect((await service.listDonationPledgesForTenant(tenantB)).map((item) => item.id)).toEqual([pledgeB.id]);
    expect((await service.listDonationPaymentsForTenant(tenantA)).map((item) => item.id)).toEqual([paymentA.id]);
    expect((await service.listDonationPaymentsForTenant(tenantB)).map((item) => item.id)).toEqual([paymentB.id]);
    expect((await service.listDonationPledgesForDonor(tenantA, donor.id)).map((item) => item.id)).toEqual([pledgeA.id]);
    expect((await service.listDonationPledgesForDonor(tenantB, donor.id)).map((item) => item.id)).toEqual([pledgeB.id]);
  });

  it('scopes expense and adjustment idempotency keys to the tenant in persisted Firestore data', async () => {
    const suffix = `emulator-cross-tenant-finance-idempotency-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tenantA = `${tenantId}-finance-idempotency-a-${suffix}`;
    const tenantB = `${tenantId}-finance-idempotency-b-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const createVerifiedPayment = async (targetTenant: string, label: string) => {
      const campaign = await service.createGivingCampaign({
        tenantId: targetTenant, actorUserId: `campaign-admin-${label}`, name: `Campaign ${label}`,
      });
      await service.updateGivingCampaignStatus(targetTenant, campaign.id, 'ACTIVE');
      const pledge = await service.createDonationPledge({
        tenantId: targetTenant, donorUserId: donor.id, campaignId: campaign.id,
        pledgedAmountPaise: 50000, idempotencyKey: `pledge-${label}`,
      });
      const payment = await service.recordDonationPayment({
        tenantId: targetTenant, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
        amountPaise: 50000, method: 'UPI', idempotencyKey: `payment-${label}`,
      });
      await service.approveDonationPayment(targetTenant, payment.id, `payment-approver-${label}`);
      return payment;
    };

    const expenseInput = {
      actorUserId: `shared-expense-maker-${suffix}`,
      category: 'Temple maintenance', description: 'Repair hall lights',
      reference: `shared-reference-${suffix}`, idempotencyKey: `shared-expense-key-${suffix}`,
    };
    const expenseA = await service.createDonationExpense({
      ...expenseInput, tenantId: tenantA, amountPaise: 12500,
    });
    const expenseB = await service.createDonationExpense({
      ...expenseInput, tenantId: tenantB, amountPaise: 22500,
    });

    expect(expenseA.id).not.toBe(expenseB.id);
    expect(expenseA).toMatchObject({ tenantId: tenantA, amountPaise: 12500 });
    expect(expenseB).toMatchObject({ tenantId: tenantB, amountPaise: 22500 });
    expect((await service.listDonationExpensesForTenant(tenantA)).map((item) => item.id)).toEqual([expenseA.id]);
    expect((await service.listDonationExpensesForTenant(tenantB)).map((item) => item.id)).toEqual([expenseB.id]);

    const paymentA = await createVerifiedPayment(tenantA, `a-${suffix}`);
    const paymentB = await createVerifiedPayment(tenantB, `b-${suffix}`);
    const adjustmentInput = {
      actorUserId: `shared-refund-maker-${suffix}`, kind: 'REFUND' as const,
      reason: 'Duplicate transfer', idempotencyKey: `shared-adjustment-key-${suffix}`,
    };
    const adjustmentA = await service.createDonationAdjustment({
      ...adjustmentInput, tenantId: tenantA, paymentId: paymentA.id, amountPaise: 10000,
    });
    const adjustmentB = await service.createDonationAdjustment({
      ...adjustmentInput, tenantId: tenantB, paymentId: paymentB.id, amountPaise: 15000,
    });

    expect(adjustmentA.id).not.toBe(adjustmentB.id);
    expect(adjustmentA).toMatchObject({ tenantId: tenantA, paymentId: paymentA.id, amountPaise: 10000 });
    expect(adjustmentB).toMatchObject({ tenantId: tenantB, paymentId: paymentB.id, amountPaise: 15000 });
    expect((await service.listDonationAdjustmentsForTenant(tenantA)).map((item) => item.id)).toEqual([adjustmentA.id]);
    expect((await service.listDonationAdjustmentsForTenant(tenantB)).map((item) => item.id)).toEqual([adjustmentB.id]);
    expect((await service.listDonationPaymentsForTenant(tenantA)).map((item) => item.id)).toEqual([paymentA.id]);
    expect((await service.listDonationPaymentsForTenant(tenantB)).map((item) => item.id)).toEqual([paymentB.id]);
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

  it('enforces expense maker-checker approval and prevents replay after rejection', async () => {
    const suffix = `emulator-expense-maker-checker-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-${suffix}`;
    const input = {
      tenantId: isolatedTenantId, actorUserId: `expense-maker-${suffix}`,
      category: 'Temple maintenance', description: 'Repair water pump',
      amountPaise: 12500, reference: `INV-${suffix}`,
      evidenceReferences: [`evidence://invoice-${suffix}`], idempotencyKey: `expense-${suffix}`,
    };
    await expect(service.createDonationExpense({ ...input, amountPaise: 0, idempotencyKey: `invalid-amount-${suffix}` }))
      .rejects.toThrow('EXPENSE_AMOUNT_INVALID');
    await expect(service.createDonationExpense({ ...input, incurredAt: 'not-a-date', idempotencyKey: `invalid-date-${suffix}` }))
      .rejects.toThrow('EXPENSE_DATE_INVALID');
    expect(await service.listDonationExpensesForTenant(isolatedTenantId)).toHaveLength(0);

    const expense = await service.createDonationExpense(input);
    const replay = await service.createDonationExpense(input);
    expect(replay.id).toBe(expense.id);
    await expect(service.createDonationExpense({ ...input, amountPaise: 13000 }))
      .rejects.toThrow('EXPENSE_IDEMPOTENCY_CONFLICT');

    await expect(service.approveDonationExpense(isolatedTenantId, expense.id, input.actorUserId))
      .rejects.toThrow('EXPENSE_SELF_APPROVAL');
    expect((await service.listDonationExpensesForTenant(isolatedTenantId)).find((item) => item.id === expense.id))
      .toMatchObject({ status: 'PENDING_APPROVAL', amountPaise: 12500, approvedBy: undefined });

    await expect(service.rejectDonationExpense(isolatedTenantId, expense.id, `reviewer-${suffix}`, '   '))
      .rejects.toThrow('EXPENSE_REJECTION_REASON_REQUIRED');
    const rejected = await service.rejectDonationExpense(
      isolatedTenantId, expense.id, `reviewer-${suffix}`, '  Invoice does not match the work  ',
    );
    expect(rejected).toMatchObject({
      status: 'REJECTED', approvedBy: `reviewer-${suffix}`,
      rejectionReason: 'Invoice does not match the work',
    });
    await expect(service.approveDonationExpense(isolatedTenantId, expense.id, `second-reviewer-${suffix}`))
      .rejects.toThrow('EXPENSE_NOT_PENDING');
    expect((await service.listDonationExpensesForTenant(isolatedTenantId)).filter((item) => item.id === expense.id))
      .toHaveLength(1);
  });

  it('approves a valid expense only by an independent reviewer and blocks approval replay', async () => {
    const suffix = `emulator-expense-approval-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-${suffix}`;
    const expense = await service.createDonationExpense({
      tenantId: isolatedTenantId, actorUserId: `expense-maker-${suffix}`,
      category: 'Community event', description: 'Water and seating',
      amountPaise: 8400, idempotencyKey: `expense-${suffix}`,
    });
    const approved = await service.approveDonationExpense(
      isolatedTenantId, expense.id, `finance-approver-${suffix}`,
    );
    expect(approved).toMatchObject({
      id: expense.id, status: 'APPROVED', approvedBy: `finance-approver-${suffix}`,
      amountPaise: 8400,
    });
    await expect(service.approveDonationExpense(
      isolatedTenantId, expense.id, `another-approver-${suffix}`,
    )).rejects.toThrow('EXPENSE_NOT_PENDING');
    expect((await service.listDonationExpensesForTenant(isolatedTenantId)).filter((item) => item.id === expense.id))
      .toHaveLength(1);
  });

  it('keeps adjustment idempotency and refund balances consistent through approval', async () => {
    const suffix = `emulator-adjustment-atomicity-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: isolatedTenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Adjustment workflow campaign',
    });
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: isolatedTenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 50000, idempotencyKey: `pledge-${suffix}`,
    });
    const payment = await service.recordDonationPayment({
      tenantId: isolatedTenantId, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
      amountPaise: 50000, method: 'UPI', idempotencyKey: `payment-${suffix}`,
    });
    await expect(service.createDonationAdjustment({
      tenantId: isolatedTenantId, paymentId: payment.id, actorUserId: `refund-maker-${suffix}`,
      amountPaise: 10000, kind: 'REFUND', reason: 'Attempt before verification',
      idempotencyKey: `early-adjustment-${suffix}`,
    })).rejects.toThrow('PAYMENT_NOT_VERIFIED');
    expect((await service.listDonationPaymentsForTenant(isolatedTenantId)).find((item) => item.id === payment.id))
      .toMatchObject({ status: 'PENDING_APPROVAL', adjustedAmountPaise: 0, pendingAdjustmentAmountPaise: 0 });

    await service.approveDonationPayment(isolatedTenantId, payment.id, `payment-approver-${suffix}`);

    const input = {
      tenantId: isolatedTenantId, paymentId: payment.id, actorUserId: `refund-maker-${suffix}`,
      amountPaise: 20000, kind: 'REFUND' as const, reason: 'Duplicate transfer',
      reference: `REFUND-${suffix}`, evidenceReferences: [`evidence://refund-${suffix}`],
      idempotencyKey: `adjustment-${suffix}`,
    };
    const adjustment = await service.createDonationAdjustment(input);
    const replay = await service.createDonationAdjustment(input);
    expect(replay.id).toBe(adjustment.id);
    await expect(service.createDonationAdjustment({ ...input, amountPaise: 21000 }))
      .rejects.toThrow('ADJUSTMENT_IDEMPOTENCY_CONFLICT');
    await expect(service.createDonationAdjustment({
      ...input, amountPaise: 31000, idempotencyKey: `over-limit-${suffix}`,
    })).rejects.toThrow('ADJUSTMENT_EXCEEDS_PAYMENT');

    await expect(service.approveDonationAdjustment(isolatedTenantId, adjustment.id, input.actorUserId))
      .rejects.toThrow('ADJUSTMENT_SELF_APPROVAL');
    expect((await service.listDonationPaymentsForTenant(isolatedTenantId)).find((item) => item.id === payment.id))
      .toMatchObject({ status: 'VERIFIED', amountPaise: 50000 });
    const approved = await service.approveDonationAdjustment(
      isolatedTenantId, adjustment.id, `independent-adjustment-approver-${suffix}`,
    );
    expect(approved).toMatchObject({
      id: adjustment.id, status: 'APPROVED', amountPaise: 20000,
      approvedBy: `independent-adjustment-approver-${suffix}`,
    });
    expect(approved.adjustmentNumber).toContain('JCP-ADJ-');

    const persistedPayment = (await service.listDonationPaymentsForTenant(isolatedTenantId))
      .find((item) => item.id === payment.id);
    expect(persistedPayment).toMatchObject({
      status: 'VERIFIED', adjustedAmountPaise: 20000, pendingAdjustmentAmountPaise: 0,
    });
    expect((await service.listDonationPledgesForTenant(isolatedTenantId)).find((item) => item.id === pledge.id))
      .toMatchObject({ paidAmountPaise: 30000, status: 'PARTIALLY_PAID' });
    expect(await service.listDonationReceiptsForTenant(isolatedTenantId)).toHaveLength(1);
    await expect(service.approveDonationAdjustment(
      isolatedTenantId, adjustment.id, `replay-approver-${suffix}`,
    )).rejects.toThrow('ADJUSTMENT_NOT_PENDING');
    expect((await service.listDonationAdjustmentsForTenant(isolatedTenantId)).filter((item) => item.id === adjustment.id))
      .toHaveLength(1);
  });

  it('reserves adjustment balance atomically when refund requests race', async () => {
    const suffix = `emulator-adjustment-race-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: isolatedTenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Concurrent adjustment campaign',
    });
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: isolatedTenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 50000, idempotencyKey: `pledge-${suffix}`,
    });
    const payment = await service.recordDonationPayment({
      tenantId: isolatedTenantId, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
      amountPaise: 50000, method: 'UPI', idempotencyKey: `payment-${suffix}`,
    });
    await service.approveDonationPayment(isolatedTenantId, payment.id, `payment-approver-${suffix}`);

    const createAdjustment = (label: string) => service.createDonationAdjustment({
      tenantId: isolatedTenantId, paymentId: payment.id, actorUserId: `refund-maker-${label}`,
      amountPaise: 30000, kind: 'REFUND', reason: `Concurrent refund ${label}`,
      idempotencyKey: `adjustment-${label}`,
    });
    const outcomes = await Promise.allSettled([
      createAdjustment(`a-${suffix}`),
      createAdjustment(`b-${suffix}`),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
    expect(rejected).toBeDefined();
    if (rejected?.status === 'rejected') {
      expect(String(rejected.reason?.message ?? rejected.reason)).toContain('ADJUSTMENT_EXCEEDS_PAYMENT');
    }

    const persistedPayment = (await service.listDonationPaymentsForTenant(isolatedTenantId))
      .find((item) => item.id === payment.id);
    expect(persistedPayment).toMatchObject({
      status: 'VERIFIED', amountPaise: 50000,
      adjustedAmountPaise: 0, pendingAdjustmentAmountPaise: 30000,
    });
    expect((await service.listDonationAdjustmentsForTenant(isolatedTenantId)))
      .toHaveLength(1);
    expect((await service.listDonationPledgesForTenant(isolatedTenantId)).find((item) => item.id === pledge.id))
      .toMatchObject({ paidAmountPaise: 50000, status: 'PAID' });
    expect(await service.listDonationReceiptsForTenant(isolatedTenantId)).toHaveLength(1);
  });

  it('releases a rejected refund reservation and permits a later valid full refund', async () => {
    const suffix = `emulator-adjustment-rejection-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: isolatedTenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Rejected adjustment campaign',
    });
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: isolatedTenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 50000, idempotencyKey: `pledge-${suffix}`,
    });
    const payment = await service.recordDonationPayment({
      tenantId: isolatedTenantId, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
      amountPaise: 50000, method: 'UPI', idempotencyKey: `payment-${suffix}`,
    });
    await service.approveDonationPayment(isolatedTenantId, payment.id, `payment-approver-${suffix}`);

    const rejectedRequest = await service.createDonationAdjustment({
      tenantId: isolatedTenantId, paymentId: payment.id, actorUserId: `refund-maker-${suffix}`,
      amountPaise: 20000, kind: 'REFUND', reason: 'First request', idempotencyKey: `refund-first-${suffix}`,
    });
    await expect(service.rejectDonationAdjustment(isolatedTenantId, rejectedRequest.id, `refund-maker-${suffix}`, 'not independent'))
      .rejects.toThrow('ADJUSTMENT_SELF_APPROVAL');
    await expect(service.rejectDonationAdjustment(isolatedTenantId, rejectedRequest.id, `reviewer-${suffix}`, '   '))
      .rejects.toThrow('ADJUSTMENT_REJECTION_REASON_REQUIRED');
    const rejected = await service.rejectDonationAdjustment(
      isolatedTenantId, rejectedRequest.id, `reviewer-${suffix}`, '  Refund evidence is incomplete  ',
    );
    expect(rejected).toMatchObject({
      status: 'REJECTED', approvedBy: `reviewer-${suffix}`,
      rejectionReason: 'Refund evidence is incomplete',
    });
    await expect(service.approveDonationAdjustment(isolatedTenantId, rejectedRequest.id, `later-reviewer-${suffix}`))
      .rejects.toThrow('ADJUSTMENT_NOT_PENDING');

    expect((await service.listDonationPaymentsForTenant(isolatedTenantId)).find((item) => item.id === payment.id))
      .toMatchObject({ adjustedAmountPaise: 0, pendingAdjustmentAmountPaise: 0, status: 'VERIFIED' });
    expect((await service.listDonationPledgesForTenant(isolatedTenantId)).find((item) => item.id === pledge.id))
      .toMatchObject({ paidAmountPaise: 50000, status: 'PAID' });
    const originalReceipts = await service.listDonationReceiptsForTenant(isolatedTenantId);
    expect(originalReceipts).toHaveLength(1);
    expect(originalReceipts[0]).toMatchObject({ paymentId: payment.id, amountPaise: 50000 });

    const acceptedRequest = await service.createDonationAdjustment({
      tenantId: isolatedTenantId, paymentId: payment.id, actorUserId: `second-refund-maker-${suffix}`,
      amountPaise: 50000, kind: 'REFUND', reason: 'Verified full refund', idempotencyKey: `refund-full-${suffix}`,
    });
    const approved = await service.approveDonationAdjustment(
      isolatedTenantId, acceptedRequest.id, `independent-refund-approver-${suffix}`,
    );
    expect(approved).toMatchObject({ status: 'APPROVED', amountPaise: 50000 });
    expect((await service.listDonationPaymentsForTenant(isolatedTenantId)).find((item) => item.id === payment.id))
      .toMatchObject({ adjustedAmountPaise: 50000, pendingAdjustmentAmountPaise: 0 });
    expect((await service.listDonationPledgesForTenant(isolatedTenantId)).find((item) => item.id === pledge.id))
      .toMatchObject({ paidAmountPaise: 0, status: 'PLEDGED' });
    expect(await service.listDonationReceiptsForTenant(isolatedTenantId)).toHaveLength(1);
    const adjustments = await service.listDonationAdjustmentsForTenant(isolatedTenantId);
    expect(adjustments).toHaveLength(2);
    expect(adjustments.find((item) => item.id === rejectedRequest.id)?.status).toBe('REJECTED');
    expect(adjustments.find((item) => item.id === acceptedRequest.id)?.status).toBe('APPROVED');
  });

  it('rejects refund requests against unverified payments without reserving adjustment balance', async () => {
    const suffix = `emulator-unverified-refund-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: isolatedTenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Unverified refund campaign',
    });
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: isolatedTenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 50000, idempotencyKey: `pledge-${suffix}`,
    });
    const payment = await service.recordDonationPayment({
      tenantId: isolatedTenantId, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
      amountPaise: 30000, method: 'UPI', idempotencyKey: `payment-${suffix}`,
    });

    await expect(service.createDonationAdjustment({
      tenantId: isolatedTenantId, paymentId: payment.id, actorUserId: `refund-requester-${suffix}`,
      amountPaise: 10000, kind: 'REFUND', reason: 'Duplicate payment',
      idempotencyKey: `refund-${suffix}`,
    })).rejects.toThrow('PAYMENT_NOT_VERIFIED');

    const persisted = (await service.listDonationPaymentsForTenant(isolatedTenantId))
      .find((item) => item.id === payment.id);
    expect(persisted).toMatchObject({
      status: 'PENDING_APPROVAL', adjustedAmountPaise: 0, pendingAdjustmentAmountPaise: 0,
    });
    expect(await service.listDonationAdjustmentsForTenant(isolatedTenantId)).toHaveLength(0);
    expect((await service.listDonationPledgesForTenant(isolatedTenantId)).find((item) => item.id === pledge.id))
      .toMatchObject({ paidAmountPaise: 0, status: 'PLEDGED' });
    expect(await service.listDonationReceiptsForTenant(isolatedTenantId)).toHaveLength(0);
  });

  it('reconciles persisted donation, receipt, approved expense and approved refund totals', async () => {
    const suffix = `emulator-reconciliation-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: isolatedTenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Reconciliation emulator campaign',
    });
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: isolatedTenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 100000, idempotencyKey: `pledge-${suffix}`,
    });
    const payment = await service.recordDonationPayment({
      tenantId: isolatedTenantId, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
      amountPaise: 100000, method: 'UPI', idempotencyKey: `payment-${suffix}`,
    });
    await service.approveDonationPayment(isolatedTenantId, payment.id, `payment-approver-${suffix}`);

    const expense = await service.createDonationExpense({
      tenantId: isolatedTenantId, actorUserId: `expense-maker-${suffix}`,
      category: 'Temple maintenance', description: 'Approved maintenance expense',
      amountPaise: 15000, idempotencyKey: `expense-${suffix}`,
    });
    await service.approveDonationExpense(isolatedTenantId, expense.id, `expense-approver-${suffix}`);

    const adjustment = await service.createDonationAdjustment({
      tenantId: isolatedTenantId, paymentId: payment.id, actorUserId: `refund-maker-${suffix}`,
      amountPaise: 20000, kind: 'REFUND', reason: 'Partial refund approved',
      idempotencyKey: `refund-${suffix}`,
    });
    await service.approveDonationAdjustment(isolatedTenantId, adjustment.id, `refund-approver-${suffix}`);

    const report = await service.getDonationReconciliationReport(isolatedTenantId);
    expect(report.donations).toMatchObject({ verifiedAmountPaise: 100000, verifiedPaymentCount: 1 });
    expect(report.receipts).toMatchObject({
      issuedAmountPaise: 100000, issuedReceiptCount: 1, amountDifferencePaise: 0,
      missingReceiptPaymentIds: [], orphanReceiptPaymentIds: [], amountMismatchPaymentIds: [], isBalanced: true,
    });
    expect(report.expenses).toMatchObject({ approvedAmountPaise: 15000, approvedCount: 1, pendingCount: 0, rejectedCount: 0 });
    expect(report.adjustments).toMatchObject({ approvedAmountPaise: 20000, approvedCount: 1, pendingCount: 0, rejectedCount: 0 });
    expect(report.netAfterApprovedExpensesPaise).toBe(85000);
    expect(report.netAfterApprovedExpensesAndAdjustmentsPaise).toBe(65000);
    expect((await service.listDonationPledgesForTenant(isolatedTenantId)).find((item) => item.id === pledge.id))
      .toMatchObject({ paidAmountPaise: 80000, status: 'PARTIALLY_PAID' });
  });


  it('prevents cross-tenant expense approval and rejection without disclosing the expense', async () => {
    const suffix = `emulator-expense-tenant-boundary-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tenantA = `${tenantId}-a-${suffix}`;
    const tenantB = `${tenantId}-b-${suffix}`;
    const expense = await service.createDonationExpense({
      tenantId: tenantA, actorUserId: `expense-maker-${suffix}`,
      category: 'Maintenance', description: 'Repair temple lights',
      amountPaise: 25000, idempotencyKey: `expense-${suffix}`,
    });

    await expect(service.approveDonationExpense(tenantB, expense.id, `tenant-b-reviewer-${suffix}`))
      .rejects.toThrow('EXPENSE_NOT_FOUND');
    await expect(service.rejectDonationExpense(
      tenantB, expense.id, `tenant-b-reviewer-${suffix}`, 'Not our expense',
    )).rejects.toThrow('EXPENSE_NOT_FOUND');

    expect(await service.listDonationExpensesForTenant(tenantB)).toHaveLength(0);
    expect(await service.listDonationExpensesForTenant(tenantA)).toMatchObject([
      { id: expense.id, tenantId: tenantA, status: 'PENDING_APPROVAL', amountPaise: 25000 },
    ]);
  });

  it('prevents cross-tenant refund creation and review without changing either tenant balance', async () => {
    const suffix = `emulator-adjustment-tenant-boundary-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tenantA = `${tenantId}-a-${suffix}`;
    const tenantB = `${tenantId}-b-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: tenantA, actorUserId: `campaign-admin-${suffix}`, name: 'Tenant boundary campaign',
    });
    await service.updateGivingCampaignStatus(tenantA, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: tenantA, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 50000, idempotencyKey: `pledge-${suffix}`,
    });
    const payment = await service.recordDonationPayment({
      tenantId: tenantA, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
      amountPaise: 50000, method: 'UPI', idempotencyKey: `payment-${suffix}`,
    });
    await service.approveDonationPayment(tenantA, payment.id, `payment-reviewer-${suffix}`);

    await expect(service.createDonationAdjustment({
      tenantId: tenantB, paymentId: payment.id, actorUserId: `tenant-b-maker-${suffix}`,
      amountPaise: 10000, kind: 'REFUND', reason: 'Cross-tenant refund',
      idempotencyKey: `cross-tenant-adjustment-${suffix}`,
    })).rejects.toThrow('PAYMENT_NOT_FOUND');
    expect(await service.listDonationAdjustmentsForTenant(tenantB)).toHaveLength(0);

    const adjustment = await service.createDonationAdjustment({
      tenantId: tenantA, paymentId: payment.id, actorUserId: `tenant-a-maker-${suffix}`,
      amountPaise: 10000, kind: 'REFUND', reason: 'Valid tenant refund',
      idempotencyKey: `valid-adjustment-${suffix}`,
    });
    await expect(service.approveDonationAdjustment(tenantB, adjustment.id, `tenant-b-reviewer-${suffix}`))
      .rejects.toThrow('ADJUSTMENT_NOT_FOUND');
    await expect(service.rejectDonationAdjustment(
      tenantB, adjustment.id, `tenant-b-reviewer-${suffix}`, 'Not our refund',
    )).rejects.toThrow('ADJUSTMENT_NOT_FOUND');

    expect((await service.listDonationPaymentsForTenant(tenantA)).find((item) => item.id === payment.id))
      .toMatchObject({ amountPaise: 50000, adjustedAmountPaise: 0, pendingAdjustmentAmountPaise: 10000 });
    expect((await service.listDonationPledgesForTenant(tenantA)).find((item) => item.id === pledge.id))
      .toMatchObject({ paidAmountPaise: 50000, status: 'PAID' });
    expect(await service.listDonationAdjustmentsForTenant(tenantB)).toHaveLength(0);
    expect(await service.listDonationAdjustmentsForTenant(tenantA)).toMatchObject([
      { id: adjustment.id, tenantId: tenantA, status: 'PENDING_APPROVAL', amountPaise: 10000 },
    ]);
  });

  it('allows only one concurrent approval of a refund and creates one approval notification', async () => {
    const suffix = `emulator-adjustment-approval-race-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: isolatedTenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Concurrent review campaign',
    });
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: isolatedTenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 50000, idempotencyKey: `pledge-${suffix}`,
    });
    const payment = await service.recordDonationPayment({
      tenantId: isolatedTenantId, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
      amountPaise: 50000, method: 'UPI', idempotencyKey: `payment-${suffix}`,
    });
    await service.approveDonationPayment(isolatedTenantId, payment.id, `payment-reviewer-${suffix}`);
    const adjustment = await service.createDonationAdjustment({
      tenantId: isolatedTenantId, paymentId: payment.id, actorUserId: `refund-maker-${suffix}`,
      amountPaise: 20000, kind: 'REFUND', reason: 'Duplicate transfer',
      idempotencyKey: `adjustment-${suffix}`,
    });

    const outcomes = await Promise.allSettled([
      service.approveDonationAdjustment(isolatedTenantId, adjustment.id, `reviewer-a-${suffix}`),
      service.approveDonationAdjustment(isolatedTenantId, adjustment.id, `reviewer-b-${suffix}`),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
    expect(rejected).toBeDefined();
    if (rejected?.status === 'rejected') {
      expect(String(rejected.reason?.message ?? rejected.reason)).toContain('ADJUSTMENT_NOT_PENDING');
    }

    expect((await service.listDonationAdjustmentsForTenant(isolatedTenantId))
      .filter((item) => item.id === adjustment.id)).toMatchObject([
      { id: adjustment.id, status: 'APPROVED', amountPaise: 20000 },
    ]);
    expect((await service.listDonationPaymentsForTenant(isolatedTenantId)).find((item) => item.id === payment.id))
      .toMatchObject({ adjustedAmountPaise: 20000, pendingAdjustmentAmountPaise: 0 });
    expect((await service.listDonationPledgesForTenant(isolatedTenantId)).find((item) => item.id === pledge.id))
      .toMatchObject({ paidAmountPaise: 30000, status: 'PARTIALLY_PAID' });
    const notifications = await getFirestore().collection('notifications')
      .where('tenantId', '==', isolatedTenantId)
      .where('entityId', '==', adjustment.id)
      .get();
    expect(notifications.docs).toHaveLength(1);
    expect(notifications.docs[0].data()).toMatchObject({ type: 'REFUND_APPROVED', entityId: adjustment.id });
  });

  it('serializes concurrent approval and rejection so a refund has exactly one terminal outcome', async () => {
    const suffix = `emulator-adjustment-decision-race-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: isolatedTenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Concurrent decision campaign',
    });
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: isolatedTenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 40000, idempotencyKey: `pledge-${suffix}`,
    });
    const payment = await service.recordDonationPayment({
      tenantId: isolatedTenantId, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
      amountPaise: 40000, method: 'UPI', idempotencyKey: `payment-${suffix}`,
    });
    await service.approveDonationPayment(isolatedTenantId, payment.id, `payment-reviewer-${suffix}`);
    const adjustment = await service.createDonationAdjustment({
      tenantId: isolatedTenantId, paymentId: payment.id, actorUserId: `refund-maker-${suffix}`,
      amountPaise: 15000, kind: 'REFUND', reason: 'Potential duplicate',
      idempotencyKey: `adjustment-${suffix}`,
    });

    const outcomes = await Promise.allSettled([
      service.approveDonationAdjustment(isolatedTenantId, adjustment.id, `approver-${suffix}`),
      service.rejectDonationAdjustment(isolatedTenantId, adjustment.id, `rejecter-${suffix}`, 'Evidence does not support refund'),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
    expect(rejected).toBeDefined();
    if (rejected?.status === 'rejected') {
      expect(String(rejected.reason?.message ?? rejected.reason)).toContain('ADJUSTMENT_NOT_PENDING');
    }

    const persistedAdjustment = (await service.listDonationAdjustmentsForTenant(isolatedTenantId))
      .find((item) => item.id === adjustment.id);
    expect(persistedAdjustment?.status).toMatch(/^(APPROVED|REJECTED)$/);
    const persistedPayment = (await service.listDonationPaymentsForTenant(isolatedTenantId))
      .find((item) => item.id === payment.id);
    const persistedPledge = (await service.listDonationPledgesForTenant(isolatedTenantId))
      .find((item) => item.id === pledge.id);
    expect(persistedPayment).toMatchObject({ pendingAdjustmentAmountPaise: 0 });
    if (persistedAdjustment?.status === 'APPROVED') {
      expect(persistedPayment).toMatchObject({ adjustedAmountPaise: 15000 });
      expect(persistedPledge).toMatchObject({ paidAmountPaise: 25000, status: 'PARTIALLY_PAID' });
    } else {
      expect(persistedAdjustment).toMatchObject({ rejectionReason: 'Evidence does not support refund' });
      expect(persistedPayment).toMatchObject({ adjustedAmountPaise: 0 });
      expect(persistedPledge).toMatchObject({ paidAmountPaise: 40000, status: 'PAID' });
    }
    const notifications = await getFirestore().collection('notifications')
      .where('tenantId', '==', isolatedTenantId)
      .where('entityId', '==', adjustment.id)
      .get();
    expect(notifications.docs).toHaveLength(1);
  });


  it('flags missing, orphaned and amount-mismatched receipts in persisted reconciliation', async () => {
    const suffix = `emulator-receipt-integrity-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: isolatedTenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Receipt integrity campaign',
    });
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: isolatedTenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 1000000, idempotencyKey: `pledge-${suffix}`,
    });
    const payments: { id: string }[] = [];
    for (const [index, amountPaise] of [100000, 200000, 150000].entries()) {
      const payment = await service.recordDonationPayment({
        tenantId: isolatedTenantId, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
        amountPaise, method: 'UPI', idempotencyKey: `payment-${suffix}-${index}`,
      });
      await service.approveDonationPayment(isolatedTenantId, payment.id, `reviewer-${suffix}-${index}`);
      payments.push(payment);
    }

    const receipts = await service.listDonationReceiptsForTenant(isolatedTenantId);
    const mismatchedReceipt = receipts.find((receipt) => receipt.paymentId === payments[0].id);
    const missingReceipt = receipts.find((receipt) => receipt.paymentId === payments[1].id);
    const orphanReceipt = receipts.find((receipt) => receipt.paymentId === payments[2].id);
    expect(mismatchedReceipt).toBeDefined();
    expect(missingReceipt).toBeDefined();
    expect(orphanReceipt).toBeDefined();

    await getFirestore().collection('donationReceipts').doc(mismatchedReceipt!.id).update({
      amountPaise: mismatchedReceipt!.amountPaise + 100,
    });
    await getFirestore().collection('donationReceipts').doc(missingReceipt!.id).delete();
    await getFirestore().collection('donationPayments').doc(payments[2].id).update({ status: 'REJECTED' });

    const report = await service.getDonationReconciliationReport(isolatedTenantId);
    expect(report.receipts).toMatchObject({
      missingReceiptPaymentIds: [payments[1].id],
      orphanReceiptPaymentIds: [payments[2].id],
      amountMismatchPaymentIds: [payments[0].id],
      isBalanced: false,
    });
    expect(report.receipts.amountDifferencePaise).toBe(49900);
    expect(report.donations).toMatchObject({ verifiedAmountPaise: 300000, verifiedPaymentCount: 2 });
  });

  it('keeps finance and reconciliation totals aligned across verified, pending and rejected states', async () => {
    const suffix = `emulator-report-state-matrix-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tenantA = `${tenantId}-a-${suffix}`;
    const tenantB = `${tenantId}-b-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: tenantA, actorUserId: `campaign-admin-${suffix}`, name: 'Report state campaign',
    });
    await service.updateGivingCampaignStatus(tenantA, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: tenantA, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 500000, idempotencyKey: `pledge-${suffix}`,
    });

    const verifiedPayment = await service.recordDonationPayment({
      tenantId: tenantA, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
      amountPaise: 100000, method: 'UPI', idempotencyKey: `verified-payment-${suffix}`,
    });
    await service.approveDonationPayment(tenantA, verifiedPayment.id, `payment-reviewer-${suffix}`);
    const pendingPayment = await service.recordDonationPayment({
      tenantId: tenantA, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
      amountPaise: 20000, method: 'CASH', idempotencyKey: `pending-payment-${suffix}`,
    });
    const rejectedPayment = await service.recordDonationPayment({
      tenantId: tenantA, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
      amountPaise: 15000, method: 'CHEQUE', idempotencyKey: `rejected-payment-${suffix}`,
    });
    await service.rejectDonationPayment(tenantA, rejectedPayment.id, `payment-reviewer-${suffix}`, 'Cheque details did not match');

    const approvedAdjustment = await service.createDonationAdjustment({
      tenantId: tenantA, paymentId: verifiedPayment.id, actorUserId: `adjustment-maker-${suffix}`,
      amountPaise: 5000, kind: 'REFUND', reason: 'Approved partial refund',
      idempotencyKey: `approved-adjustment-${suffix}`,
    });
    await service.approveDonationAdjustment(tenantA, approvedAdjustment.id, `adjustment-reviewer-${suffix}`);
    const pendingAdjustment = await service.createDonationAdjustment({
      tenantId: tenantA, paymentId: verifiedPayment.id, actorUserId: `adjustment-maker-${suffix}`,
      amountPaise: 3000, kind: 'REFUND', reason: 'Pending partial refund',
      idempotencyKey: `pending-adjustment-${suffix}`,
    });
    const rejectedAdjustment = await service.createDonationAdjustment({
      tenantId: tenantA, paymentId: verifiedPayment.id, actorUserId: `adjustment-maker-${suffix}`,
      amountPaise: 2000, kind: 'REFUND', reason: 'Rejected partial refund',
      idempotencyKey: `rejected-adjustment-${suffix}`,
    });
    await service.rejectDonationAdjustment(tenantA, rejectedAdjustment.id, `adjustment-reviewer-${suffix}`, 'Refund evidence is insufficient');

    const approvedExpense = await service.createDonationExpense({
      tenantId: tenantA, actorUserId: `expense-maker-${suffix}`, category: 'Maintenance',
      description: 'Approved expense', amountPaise: 7000, idempotencyKey: `approved-expense-${suffix}`,
    });
    await service.approveDonationExpense(tenantA, approvedExpense.id, `expense-reviewer-${suffix}`);
    await service.createDonationExpense({
      tenantId: tenantA, actorUserId: `expense-maker-${suffix}`, category: 'Utilities',
      description: 'Pending expense', amountPaise: 8000, idempotencyKey: `pending-expense-${suffix}`,
    });
    const rejectedExpense = await service.createDonationExpense({
      tenantId: tenantA, actorUserId: `expense-maker-${suffix}`, category: 'Repairs',
      description: 'Rejected expense', amountPaise: 9000, idempotencyKey: `rejected-expense-${suffix}`,
    });
    await service.rejectDonationExpense(tenantA, rejectedExpense.id, `expense-reviewer-${suffix}`, 'Invoice does not match work');

    const finance = await service.getDonationFinanceReport(tenantA);
    expect(finance.totals).toMatchObject({
      pledgedAmountPaise: 500000,
      receivedAmountPaise: 100000,
      adjustedAmountPaise: 5000,
      netReceivedAmountPaise: 95000,
      pendingAdjustmentAmountPaise: 3000,
      rejectedAdjustmentAmountPaise: 2000,
      pendingApprovalAmountPaise: 20000,
      rejectedAmountPaise: 15000,
      verifiedPaymentCount: 1,
      pendingPaymentCount: 1,
      rejectedPaymentCount: 1,
    });
    expect(finance.byPaymentMethod.find((item) => item.method === 'UPI'))
      .toMatchObject({ verifiedAmountPaise: 100000, verifiedCount: 1 });
    expect(finance.byPaymentMethod.find((item) => item.method === 'CASH'))
      .toMatchObject({ verifiedAmountPaise: 0, verifiedCount: 0 });
    expect(finance.byCampaign).toMatchObject([
      { campaignId: campaign.id, pledgedAmountPaise: 500000, receivedAmountPaise: 100000 },
    ]);

    const reconciliation = await service.getDonationReconciliationReport(tenantA);
    expect(reconciliation.receipts).toMatchObject({
      issuedAmountPaise: 100000, issuedReceiptCount: 1, isBalanced: true,
    });
    expect(reconciliation.expenses).toMatchObject({
      approvedAmountPaise: 7000, approvedCount: 1,
      pendingAmountPaise: 8000, pendingCount: 1,
      rejectedAmountPaise: 9000, rejectedCount: 1,
    });
    expect(reconciliation.adjustments).toMatchObject({
      approvedAmountPaise: 5000, approvedCount: 1,
      pendingAmountPaise: 3000, pendingCount: 1,
      rejectedAmountPaise: 2000, rejectedCount: 1,
    });
    expect(reconciliation.netAfterApprovedExpensesPaise).toBe(93000);
    expect(reconciliation.netAfterApprovedExpensesAndAdjustmentsPaise).toBe(88000);

    const otherTenantFinance = await service.getDonationFinanceReport(tenantB);
    expect(otherTenantFinance.totals).toMatchObject({
      pledgedAmountPaise: 0, receivedAmountPaise: 0, pledgeCount: 0, verifiedPaymentCount: 0,
    });
    expect(otherTenantFinance.byCampaign).toHaveLength(0);
    const otherTenantReconciliation = await service.getDonationReconciliationReport(tenantB);
    expect(otherTenantReconciliation).toMatchObject({
      tenantId: tenantB,
      donations: { verifiedAmountPaise: 0, verifiedPaymentCount: 0 },
      receipts: { issuedAmountPaise: 0, issuedReceiptCount: 0, amountDifferencePaise: 0, isBalanced: true },
      netAfterApprovedExpensesAndAdjustmentsPaise: 0,
    });
    expect(pendingPayment.status).toBe('PENDING_APPROVAL');
    expect(pendingAdjustment.status).toBe('PENDING_APPROVAL');
  });

  it('returns zero-valued finance reports and a balanced reconciliation for an empty tenant', async () => {
    const emptyTenant = `${tenantId}-empty-report-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const finance = await service.getDonationFinanceReport(emptyTenant);
    const reconciliation = await service.getDonationReconciliationReport(emptyTenant);

    expect(finance.totals).toMatchObject({
      pledgedAmountPaise: 0, receivedAmountPaise: 0, adjustedAmountPaise: 0,
      netReceivedAmountPaise: 0, outstandingAmountPaise: 0, pledgeCount: 0,
      verifiedPaymentCount: 0, pendingPaymentCount: 0, rejectedPaymentCount: 0,
    });
    expect(finance.byCampaign).toHaveLength(0);
    expect(finance.byPaymentMethod).toHaveLength(4);
    expect(finance.byPaymentMethod.every((item) => item.verifiedAmountPaise === 0 && item.verifiedCount === 0)).toBe(true);
    expect(reconciliation).toMatchObject({
      tenantId: emptyTenant,
      donations: { verifiedAmountPaise: 0, verifiedPaymentCount: 0 },
      receipts: {
        issuedAmountPaise: 0, issuedReceiptCount: 0, amountDifferencePaise: 0,
        missingReceiptPaymentIds: [], orphanReceiptPaymentIds: [], amountMismatchPaymentIds: [], isBalanced: true,
      },
      expenses: { approvedAmountPaise: 0, pendingAmountPaise: 0, rejectedAmountPaise: 0 },
      adjustments: { approvedAmountPaise: 0, pendingAmountPaise: 0, rejectedAmountPaise: 0 },
      netAfterApprovedExpensesPaise: 0,
      netAfterApprovedExpensesAndAdjustmentsPaise: 0,
    });
  });

  it('prevents a tenant from changing another tenant campaign status by ID', async () => {
    const suffix = `emulator-cross-tenant-campaign-status-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tenantA = `${tenantId}-campaign-owner-${suffix}`;
    const tenantB = `${tenantId}-campaign-attacker-${suffix}`;
    const campaign = await service.createGivingCampaign({
      tenantId: tenantA, actorUserId: `campaign-admin-${suffix}`, name: 'Tenant-owned campaign',
    });
    await service.updateGivingCampaignStatus(tenantA, campaign.id, 'ACTIVE');

    await expect(service.updateGivingCampaignStatus(tenantB, campaign.id, 'CLOSED')).resolves.toBeNull();

    expect(await service.listGivingCampaigns(tenantA, true)).toMatchObject([
      { id: campaign.id, tenantId: tenantA, status: 'ACTIVE' },
    ]);
    expect(await service.listGivingCampaigns(tenantB, true)).toHaveLength(0);
  });

  it('prevents cross-tenant approval or rejection of payments, expenses and adjustments', async () => {
    const suffix = `emulator-cross-tenant-mutations-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tenantA = `${tenantId}-mutation-owner-${suffix}`;
    const tenantB = `${tenantId}-mutation-attacker-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: tenantA, actorUserId: `campaign-admin-${suffix}`, name: 'Cross-tenant mutation campaign',
    });
    await service.updateGivingCampaignStatus(tenantA, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: tenantA, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 100000, idempotencyKey: `pledge-${suffix}`,
    });
    const payment = await service.recordDonationPayment({
      tenantId: tenantA, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
      amountPaise: 50000, method: 'UPI', idempotencyKey: `payment-${suffix}`,
    });

    await expect(service.approveDonationPayment(tenantB, payment.id, `attacker-approver-${suffix}`))
      .rejects.toThrow('PAYMENT_NOT_FOUND');
    await expect(service.rejectDonationPayment(tenantB, payment.id, `attacker-rejecter-${suffix}`, 'Unauthorized rejection'))
      .rejects.toThrow('PAYMENT_NOT_FOUND');
    const paymentAfterCrossTenantAttempts = (await service.listDonationPaymentsForTenant(tenantA))
      .find((item) => item.id === payment.id);
    expect(paymentAfterCrossTenantAttempts?.status).toBe('PENDING_APPROVAL');
    expect(paymentAfterCrossTenantAttempts?.approvedBy).toBeUndefined();
    expect(paymentAfterCrossTenantAttempts?.rejectionReason).toBeUndefined();
    expect(await service.listDonationReceiptsForTenant(tenantB)).toHaveLength(0);

    await service.approveDonationPayment(tenantA, payment.id, `legitimate-reviewer-${suffix}`);
    const expense = await service.createDonationExpense({
      tenantId: tenantA, actorUserId: `expense-maker-${suffix}`, category: 'Maintenance',
      description: 'Cross-tenant approval test', amountPaise: 10000, idempotencyKey: `expense-${suffix}`,
    });
    await expect(service.approveDonationExpense(tenantB, expense.id, `attacker-approver-${suffix}`))
      .rejects.toThrow('EXPENSE_NOT_FOUND');
    await expect(service.rejectDonationExpense(tenantB, expense.id, `attacker-rejecter-${suffix}`, 'Unauthorized rejection'))
      .rejects.toThrow('EXPENSE_NOT_FOUND');
    const expenseAfterCrossTenantAttempts = (await service.listDonationExpensesForTenant(tenantA))
      .find((item) => item.id === expense.id);
    expect(expenseAfterCrossTenantAttempts?.status).toBe('PENDING_APPROVAL');
    expect(expenseAfterCrossTenantAttempts?.approvedBy).toBeUndefined();
    expect(expenseAfterCrossTenantAttempts?.rejectionReason).toBeUndefined();

    const adjustment = await service.createDonationAdjustment({
      tenantId: tenantA, paymentId: payment.id, actorUserId: `adjustment-maker-${suffix}`,
      amountPaise: 5000, kind: 'REFUND', reason: 'Cross-tenant approval test',
      idempotencyKey: `adjustment-${suffix}`,
    });
    await expect(service.approveDonationAdjustment(tenantB, adjustment.id, `attacker-approver-${suffix}`))
      .rejects.toThrow('ADJUSTMENT_NOT_FOUND');
    await expect(service.rejectDonationAdjustment(tenantB, adjustment.id, `attacker-rejecter-${suffix}`, 'Unauthorized rejection'))
      .rejects.toThrow('ADJUSTMENT_NOT_FOUND');
    const adjustmentAfterCrossTenantAttempts = (await service.listDonationAdjustmentsForTenant(tenantA))
      .find((item) => item.id === adjustment.id);
    expect(adjustmentAfterCrossTenantAttempts?.status).toBe('PENDING_APPROVAL');
    expect(adjustmentAfterCrossTenantAttempts?.approvedBy).toBeUndefined();
    expect(adjustmentAfterCrossTenantAttempts?.rejectionReason).toBeUndefined();
    expect((await service.listDonationPaymentsForTenant(tenantA)).find((item) => item.id === payment.id))
      .toMatchObject({ status: 'VERIFIED', pendingAdjustmentAmountPaise: 5000, adjustedAmountPaise: 0 });
    expect(await service.listDonationReceiptsForTenant(tenantA)).toHaveLength(1);
    expect(await service.listDonationReceiptsForTenant(tenantB)).toHaveLength(0);
  });

  it('rejects cross-tenant campaign, pledge and payment references when creating finance records', async () => {
    const suffix = `emulator-cross-tenant-references-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tenantA = `${tenantId}-reference-owner-${suffix}`;
    const tenantB = `${tenantId}-reference-attacker-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: tenantA, actorUserId: `campaign-admin-${suffix}`, name: 'Tenant-owned campaign',
    });
    await service.updateGivingCampaignStatus(tenantA, campaign.id, 'ACTIVE');
    const pledge = await service.createDonationPledge({
      tenantId: tenantA, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 100000, idempotencyKey: `pledge-${suffix}`,
    });
    const payment = await service.recordDonationPayment({
      tenantId: tenantA, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
      amountPaise: 50000, method: 'UPI', idempotencyKey: `payment-${suffix}`,
    });
    await service.approveDonationPayment(tenantA, payment.id, `reviewer-${suffix}`);

    await expect(service.createDonationPledge({
      tenantId: tenantB, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 10000, idempotencyKey: `foreign-campaign-pledge-${suffix}`,
    })).rejects.toThrow('CAMPAIGN_NOT_FOUND');

    await expect(service.recordDonationPayment({
      tenantId: tenantB, pledgeId: pledge.id, actorUserId: `foreign-cashier-${suffix}`,
      amountPaise: 10000, method: 'UPI', idempotencyKey: `foreign-pledge-payment-${suffix}`,
    })).rejects.toThrow('PLEDGE_NOT_FOUND');

    await expect(service.createDonationAdjustment({
      tenantId: tenantB, paymentId: payment.id, actorUserId: `foreign-adjustment-maker-${suffix}`,
      amountPaise: 5000, kind: 'REFUND', reason: 'Cross-tenant reference test',
      idempotencyKey: `foreign-payment-adjustment-${suffix}`,
    })).rejects.toThrow('PAYMENT_NOT_FOUND');

    expect(await service.listDonationPledgesForTenant(tenantB)).toHaveLength(0);
    expect(await service.listDonationPaymentsForTenant(tenantB)).toHaveLength(0);
    expect(await service.listDonationAdjustmentsForTenant(tenantB)).toHaveLength(0);
    expect((await service.listDonationPledgesForTenant(tenantA)).map((item) => item.id)).toEqual([pledge.id]);
    expect((await service.listDonationPaymentsForTenant(tenantA)).find((item) => item.id === payment.id))
      .toMatchObject({ tenantId: tenantA, status: 'VERIFIED', pendingAdjustmentAmountPaise: 0, adjustedAmountPaise: 0 });
    expect(await service.listDonationAdjustmentsForTenant(tenantA)).toHaveLength(0);
  });

  it('deduplicates concurrent same-key pledge, payment, expense and adjustment writes in persisted Firestore data', async () => {
    const suffix = `emulator-concurrent-idempotency-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-concurrent-idempotency-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: isolatedTenantId, actorUserId: `campaign-admin-${suffix}`, name: 'Concurrent idempotency campaign',
    });
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'ACTIVE');

    const pledgeInput = {
      tenantId: isolatedTenantId, donorUserId: donor.id, campaignId: campaign.id,
      pledgedAmountPaise: 100000, idempotencyKey: `same-pledge-key-${suffix}`,
    };
    const pledges = await Promise.all(Array.from({ length: 5 }, () => service.createDonationPledge(pledgeInput)));
    expect(new Set(pledges.map((item) => item.id)).size).toBe(1);
    expect((await service.listDonationPledgesForTenant(isolatedTenantId))).toHaveLength(1);
    const pledge = pledges[0];

    const paymentInput = {
      tenantId: isolatedTenantId, pledgeId: pledge.id, actorUserId: `cashier-${suffix}`,
      amountPaise: 40000, method: 'UPI' as const, idempotencyKey: `same-payment-key-${suffix}`,
      note: 'Concurrent payment submission',
    };
    const payments = await Promise.all(Array.from({ length: 5 }, () => service.recordDonationPayment(paymentInput)));
    expect(new Set(payments.map((item) => item.id)).size).toBe(1);
    expect((await service.listDonationPaymentsForTenant(isolatedTenantId))).toHaveLength(1);
    const payment = payments[0];
    await service.approveDonationPayment(isolatedTenantId, payment.id, `payment-approver-${suffix}`);

    const expenseInput = {
      tenantId: isolatedTenantId, actorUserId: `expense-maker-${suffix}`, category: 'Maintenance',
      description: 'Concurrent expense submission', amountPaise: 12500,
      idempotencyKey: `same-expense-key-${suffix}`,
    };
    const expenses = await Promise.all(Array.from({ length: 5 }, () => service.createDonationExpense(expenseInput)));
    expect(new Set(expenses.map((item) => item.id)).size).toBe(1);
    expect((await service.listDonationExpensesForTenant(isolatedTenantId))).toHaveLength(1);

    const adjustmentInput = {
      tenantId: isolatedTenantId, paymentId: payment.id, actorUserId: `refund-maker-${suffix}`,
      amountPaise: 5000, kind: 'REFUND' as const, reason: 'Concurrent duplicate refund request',
      idempotencyKey: `same-adjustment-key-${suffix}`,
    };
    const adjustments = await Promise.all(Array.from({ length: 5 }, () => service.createDonationAdjustment(adjustmentInput)));
    expect(new Set(adjustments.map((item) => item.id)).size).toBe(1);
    expect((await service.listDonationAdjustmentsForTenant(isolatedTenantId))).toHaveLength(1);

    expect((await service.listDonationPledgesForTenant(isolatedTenantId))[0]).toMatchObject({ pledgedAmountPaise: 100000, paidAmountPaise: 40000 });
    expect((await service.listDonationPaymentsForTenant(isolatedTenantId))[0]).toMatchObject({ amountPaise: 40000, status: 'VERIFIED' });
    expect(expenses[0]).toMatchObject({ amountPaise: 12500, status: 'PENDING_APPROVAL' });
    expect(adjustments[0]).toMatchObject({ amountPaise: 5000, status: 'PENDING_APPROVAL' });
  }, 30000);


  it('isolates persisted tenant memberships across list, lookup, and deletion', async () => {
    const suffix = `emulator-membership-isolation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tenantA = `${tenantId}-membership-a-${suffix}`;
    const tenantB = `${tenantId}-membership-b-${suffix}`;
    const sharedUser = `membership-shared-user-${suffix}`;
    const tenantAOnlyUser = `membership-tenant-a-user-${suffix}`;

    await service.upsertUser({ subject: sharedUser, email: `${sharedUser}@example.test`, displayName: 'Shared user' });
    await service.upsertUser({ subject: tenantAOnlyUser, email: `${tenantAOnlyUser}@example.test`, displayName: 'Tenant A only' });

    const membershipA = await service.createMembership({
      userId: sharedUser, tenantId: tenantA, role: 'CONTENT_MANAGER',
    });
    const membershipB = await service.createMembership({
      userId: sharedUser, tenantId: tenantB, role: 'EVENT_MANAGER',
    });
    await service.createMembership({
      userId: tenantAOnlyUser, tenantId: tenantA, role: 'TENANT_ADMIN',
    });

    expect(membershipA.id).not.toBe(membershipB.id);
    expect(await service.getMembership(sharedUser, tenantA)).toMatchObject({
      userId: sharedUser, tenantId: tenantA, role: 'CONTENT_MANAGER',
    });
    expect(await service.getMembership(sharedUser, tenantB)).toMatchObject({
      userId: sharedUser, tenantId: tenantB, role: 'EVENT_MANAGER',
    });

    const membersA = await service.listMemberships(tenantA);
    const membersB = await service.listMemberships(tenantB);
    expect(membersA.map((member) => member.userId).sort()).toEqual([sharedUser, tenantAOnlyUser].sort());
    expect(membersA.every((member) => member.tenantId === tenantA)).toBe(true);
    expect(membersB.map((member) => member.userId)).toEqual([sharedUser]);
    expect(membersB.every((member) => member.tenantId === tenantB)).toBe(true);

    await service.deleteMembership(sharedUser, tenantA);
    expect(await service.getMembership(sharedUser, tenantA)).toBeNull();
    expect(await service.getMembership(sharedUser, tenantB)).toMatchObject({
      userId: sharedUser, tenantId: tenantB, role: 'EVENT_MANAGER',
    });
    expect(await service.listMemberships(tenantB)).toHaveLength(1);
  }, 15000);


  it('updates persisted roles only for the selected tenant membership', async () => {
    const suffix = `emulator-membership-role-isolation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tenantA = `${tenantId}-role-a-${suffix}`;
    const tenantB = `${tenantId}-role-b-${suffix}`;
    const sharedUser = `shared-role-user-${suffix}`;

    await service.upsertUser({ subject: sharedUser });
    await service.createMembership({
      userId: sharedUser, tenantId: tenantA, role: 'TEMPLE_ADMIN',
    });
    await service.createMembership({
      userId: sharedUser, tenantId: tenantB, role: 'EVENT_MANAGER',
    });

    const updated = await service.updateMembershipRoles(
      sharedUser, tenantA, ['DONOR', 'EVENT_MANAGER'], 'DONOR',
    );
    expect(updated).toMatchObject({
      userId: sharedUser, tenantId: tenantA, role: 'DONOR',
      roles: ['DONOR', 'EVENT_MANAGER'],
    });

    expect(await service.getMembership(sharedUser, tenantB)).toMatchObject({
      userId: sharedUser, tenantId: tenantB, role: 'EVENT_MANAGER',
      roles: ['EVENT_MANAGER'],
    });
    expect(await service.listMemberships(tenantA)).toMatchObject([
      expect.objectContaining({ userId: sharedUser, tenantId: tenantA, role: 'DONOR' }),
    ]);
    expect(await service.listMemberships(tenantB)).toMatchObject([
      expect.objectContaining({ userId: sharedUser, tenantId: tenantB, role: 'EVENT_MANAGER' }),
    ]);
  }, 15000);


  it('preserves the shared user record when one tenant membership is deleted', async () => {
    const suffix = `emulator-membership-delete-user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tenantA = `${tenantId}-delete-a-${suffix}`;
    const tenantB = `${tenantId}-delete-b-${suffix}`;
    const authSubject = `shared-delete-user-${suffix}`;
    const user = await service.upsertUser({
      subject: authSubject, email: `${authSubject}@example.test`,
    });

    await service.createMembership({ userId: user.id, tenantId: tenantA, role: 'TEMPLE_ADMIN' });
    await service.createMembership({ userId: user.id, tenantId: tenantB, role: 'EVENT_MANAGER' });

    await service.deleteMembership(user.id, tenantA);

    expect(await service.getMembership(user.id, tenantA)).toBeNull();
    expect(await service.getMembership(user.id, tenantB)).toMatchObject({
      userId: user.id, tenantId: tenantB, role: 'EVENT_MANAGER',
    });
    expect(await service.getUser(user.id)).toMatchObject({
      id: user.id, email: `${authSubject}@example.test`,
    });
    expect(await service.listMemberships(tenantB)).toMatchObject([
      expect.objectContaining({ userId: user.id, tenantId: tenantB, role: 'EVENT_MANAGER' }),
    ]);
  }, 15000);


  it('preserves non-financial roles and isolates persisted finance-role grant and revocation by tenant', async () => {
    const suffix = `emulator-finance-role-isolation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tenantA = `${tenantId}-finance-role-a-${suffix}`;
    const tenantB = `${tenantId}-finance-role-b-${suffix}`;
    const email = `finance-role-user-${suffix}@example.test`;
    const user = await service.upsertUser({
      subject: `finance-role-user-${suffix}`,
      email,
      displayName: 'Finance role isolation user',
    });

    await service.createMembership({
      userId: user.id,
      tenantId: tenantA,
      role: 'CONTENT_MANAGER',
      roles: ['CONTENT_MANAGER'],
    });
    await service.createMembership({
      userId: user.id,
      tenantId: tenantB,
      role: 'EVENT_MANAGER',
      roles: ['EVENT_MANAGER'],
    });

    const memberships = new MembershipService(service);
    const granted = await memberships.grantFinancialRoleByEmail(
      email,
      tenantA,
      'FINANCE_OPERATOR',
      `platform-actor-${suffix}`,
    );

    expect(granted).toMatchObject({
      userId: user.id,
      tenantId: tenantA,
      role: 'CONTENT_MANAGER',
      roles: ['CONTENT_MANAGER', 'FINANCE_OPERATOR'],
    });
    expect(await service.getMembership(user.id, tenantA)).toMatchObject({
      userId: user.id,
      tenantId: tenantA,
      role: 'CONTENT_MANAGER',
      roles: ['CONTENT_MANAGER', 'FINANCE_OPERATOR'],
    });
    expect(await service.getMembership(user.id, tenantB)).toMatchObject({
      userId: user.id,
      tenantId: tenantB,
      role: 'EVENT_MANAGER',
      roles: ['EVENT_MANAGER'],
    });

    const revoked = await memberships.revokeFinancialRole(
      user.id,
      tenantA,
      'FINANCE_OPERATOR',
    );
    expect(revoked).toMatchObject({
      userId: user.id,
      tenantId: tenantA,
      roles: ['CONTENT_MANAGER'],
      previousRoles: ['CONTENT_MANAGER', 'FINANCE_OPERATOR'],
      membershipDeleted: false,
    });
    expect(await service.getMembership(user.id, tenantA)).toMatchObject({
      userId: user.id,
      tenantId: tenantA,
      role: 'CONTENT_MANAGER',
      roles: ['CONTENT_MANAGER'],
    });
    expect(await service.getMembership(user.id, tenantB)).toMatchObject({
      userId: user.id,
      tenantId: tenantB,
      role: 'EVENT_MANAGER',
      roles: ['EVENT_MANAGER'],
    });
  }, 15000);



  it('revoking the last finance role deletes only that tenant membership and preserves shared identity', async () => {
    const suffix = `emulator-finance-final-role-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const tenantA = `${tenantId}-finance-final-a-${suffix}`;
    const tenantB = `${tenantId}-finance-final-b-${suffix}`;
    const authSubject = `finance-final-user-${suffix}`;
    const email = `${authSubject}@example.test`;
    const user = await service.upsertUser({
      subject: authSubject,
      email,
      displayName: 'Final finance role user',
    });

    await service.createMembership({
      userId: user.id,
      tenantId: tenantA,
      role: 'FINANCE_VIEWER',
      roles: ['FINANCE_VIEWER'],
    });
    await service.createMembership({
      userId: user.id,
      tenantId: tenantB,
      role: 'EVENT_MANAGER',
      roles: ['EVENT_MANAGER'],
    });

    const memberships = new MembershipService(service);
    const revoked = await memberships.revokeFinancialRole(
      user.id,
      tenantA,
      'FINANCE_VIEWER',
    );

    expect(revoked).toMatchObject({
      userId: user.id,
      tenantId: tenantA,
      roles: [],
      previousRoles: ['FINANCE_VIEWER'],
      membershipDeleted: true,
    });
    expect(await service.getMembership(user.id, tenantA)).toBeNull();
    expect(await service.listMemberships(tenantA)).toHaveLength(0);
    expect(await service.getMembership(user.id, tenantB)).toMatchObject({
      userId: user.id,
      tenantId: tenantB,
      role: 'EVENT_MANAGER',
      roles: ['EVENT_MANAGER'],
    });
    expect(await service.listMemberships(tenantB)).toMatchObject([
      expect.objectContaining({
        userId: user.id,
        tenantId: tenantB,
        role: 'EVENT_MANAGER',
      }),
    ]);
    expect(await service.getUser(user.id)).toMatchObject({
      id: user.id,
      email,
      displayName: 'Final finance role user',
    });
  }, 15000);


  it('deduplicates concurrent pledge creation with the same idempotency key', async () => {
    const suffix = `emulator-concurrent-pledge-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const isolatedTenantId = `${tenantId}-${suffix}`;
    const donor = await service.upsertUser({ subject: `donor-${suffix}` });
    const campaign = await service.createGivingCampaign({
      tenantId: isolatedTenantId,
      actorUserId: `campaign-admin-${suffix}`,
      name: 'Concurrent pledge campaign',
    });
    await service.updateGivingCampaignStatus(isolatedTenantId, campaign.id, 'ACTIVE');

    const input = {
      tenantId: isolatedTenantId,
      donorUserId: donor.id,
      campaignId: campaign.id,
      pledgedAmountPaise: 50000,
      idempotencyKey: `pledge-concurrent-${suffix}`,
    };
    const [first, second] = await Promise.all([
      service.createDonationPledge(input),
      service.createDonationPledge(input),
    ]);

    expect(first.id).toBe(second.id);
    const persisted = await service.listDonationPledgesForTenant(isolatedTenantId);
    expect(persisted).toHaveLength(1);
    expect(persisted[0]).toMatchObject({
      id: first.id,
      donorUserId: donor.id,
      campaignId: campaign.id,
      pledgedAmountPaise: 50000,
      paidAmountPaise: 0,
      status: 'PLEDGED',
    });
    expect(await service.listDonationPaymentsForTenant(isolatedTenantId)).toHaveLength(0);
    expect(await service.listDonationReceiptsForTenant(isolatedTenantId)).toHaveLength(0);
  }, 15000);


});
