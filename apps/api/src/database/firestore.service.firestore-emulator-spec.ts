import { ConfigService } from '@nestjs/config';
import { getApps } from 'firebase-admin/app';
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
    if (app) await app.delete();
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
});
