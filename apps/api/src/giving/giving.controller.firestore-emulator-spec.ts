import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { deleteApp, getApps } from 'firebase-admin/app';
import request from 'supertest';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { AppModule } from '../app.module';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { AuthenticatedRequest } from '../auth/authenticated-request';
import { AuthenticatedUser } from '../auth/auth.types';
import { MembershipService } from '../authorization/membership.service';
import { GivingService } from './giving.service';
import { FirestoreService } from '../database/firestore.service';
import { UserIdentityService } from '../identity/user-identity.service';
import { FirestoreTenantResolver } from '../tenant/firestore-tenant.resolver';

describe('Giving HTTP journey against the Firestore emulator', () => {
  let app: INestApplication;
  let firestore: FirestoreService;
  let identity: UserIdentityService;
  let tenantId: string;
  let donorSubject: string;
  let operatorSubject: string;
  let approverSubject: string;
  let crossTenantFinanceSubject: string;
  let otherTenantId: string;
  let operatorId: string;
  let approverId: string;
  let crossTenantFinanceId: string;

  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('FIRESTORE_EMULATOR_HOST must point to the local Firestore emulator');
    }

    process.env.NODE_ENV = 'test';
    process.env.FIREBASE_PROJECT_ID = 'demo-jcp';
    process.env.FIRESTORE_DATABASE_ID = '(default)';

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    tenantId = `emulator-http-giving-${suffix}`;
    otherTenantId = `${tenantId}-other`;
    donorSubject = `donor-${suffix}`;
    operatorSubject = `operator-${suffix}`;
    approverSubject = `approver-${suffix}`;
    crossTenantFinanceSubject = `cross-tenant-finance-${suffix}`;

    const authenticationGuard = {
      canActivate: (context: ExecutionContext): boolean => {
        const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
        req.user = {
          subject: req.header('x-test-user') ?? donorSubject,
          email: `${req.header('x-test-user') ?? donorSubject}@example.test`,
        };
        return true;
      },
    };

    const tenantResolver = {
      resolve: async (hostname: string) => ({
        id: tenantId,
        name: 'Giving emulator test tenant',
        hostname: hostname.toLowerCase(),
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthenticationGuard)
      .useValue(authenticationGuard)
      .overrideProvider(FirestoreTenantResolver)
      .useValue(tenantResolver)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    await app.init();

    firestore = app.get(FirestoreService);
    identity = app.get(UserIdentityService);
    const operator = await identity.resolve({ subject: operatorSubject, email: `${operatorSubject}@example.test` } as AuthenticatedUser);
    const approver = await identity.resolve({ subject: approverSubject, email: `${approverSubject}@example.test` } as AuthenticatedUser);
    const crossTenantFinance = await identity.resolve({ subject: crossTenantFinanceSubject, email: `${crossTenantFinanceSubject}@example.test` } as AuthenticatedUser);
    await identity.resolve({ subject: donorSubject, email: `${donorSubject}@example.test` } as AuthenticatedUser);
    operatorId = operator.id;
    approverId = approver.id;
    crossTenantFinanceId = crossTenantFinance.id;

    // Use real Firestore-backed membership resolution in this emulator suite.
    // The operator keeps a general role when its finance permission is revoked.
    await firestore.createMembership({
      userId: operatorId,
      tenantId,
      role: 'CONTENT_MANAGER',
      roles: ['CONTENT_MANAGER', 'FINANCE_OPERATOR'],
    });
    await firestore.createMembership({
      userId: approverId,
      tenantId,
      role: 'FINANCE_APPROVER',
      roles: ['FINANCE_APPROVER'],
    });
    // This finance operator has a real persisted role only in tenant B.
    await firestore.createMembership({
      userId: crossTenantFinanceId,
      tenantId: otherTenantId,
      role: 'FINANCE_OPERATOR',
      roles: ['FINANCE_OPERATOR'],
    });
  });

  afterAll(async () => {
    if (app) await app.close();
    const firebaseApp = getApps().find((candidate) => candidate.name === '[DEFAULT]');
    if (firebaseApp) await deleteApp(firebaseApp);
  });

  it('denies a persisted finance membership from another tenant before financial reads or writes', async () => {
    const host = 'giving-emulator.jcp.test';
    const giving = app.get(GivingService);
    const listTenantPayments = jest.spyOn(giving, 'listTenantPayments');
    const createExpense = jest.spyOn(giving, 'createExpense');

    expect(await firestore.getMembership(crossTenantFinanceId, otherTenantId)).toMatchObject({
      userId: crossTenantFinanceId,
      tenantId: otherTenantId,
      role: 'FINANCE_OPERATOR',
    });
    await expect(firestore.getMembership(crossTenantFinanceId, tenantId)).resolves.toBeNull();

    await request(app.getHttpServer())
      .get('/api/giving/payments')
      .set('Host', host)
      .set('x-test-user', crossTenantFinanceSubject)
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/giving/expenses')
      .set('Host', host)
      .set('x-test-user', crossTenantFinanceSubject)
      .send({ category: 'Repairs', amountPaise: 1000, note: 'cross-tenant isolation regression' })
      .expect(403);

    expect(listTenantPayments).not.toHaveBeenCalled();
    expect(createExpense).not.toHaveBeenCalled();
  });

  it('creates a pledge, records and approves a payment, then serves the persisted receipt to the donor', async () => {
    const host = 'giving-emulator.jcp.test';

    const campaignResponse = await request(app.getHttpServer())
      .post('/api/giving/campaigns')
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .send({
        name: 'HTTP emulator donation journey',
        description: 'Persisted HTTP-to-Firestore regression',
        targetAmountPaise: 50000,
      })
      .expect(201);

    const campaignId = campaignResponse.body.id as string;
    expect(campaignResponse.body).toMatchObject({ tenantId, status: 'DRAFT' });

    await request(app.getHttpServer())
      .patch(`/api/giving/campaigns/${campaignId}/status`)
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .send({ status: 'ACTIVE' })
      .expect(200)
      .expect((response) => expect(response.body.status).toBe('ACTIVE'));

    const pledgeResponse = await request(app.getHttpServer())
      .post('/api/giving/pledges')
      .set('Host', host)
      .set('x-test-user', donorSubject)
      .set('idempotency-key', `pledge-${tenantId}`)
      .send({ campaignId, pledgedAmountPaise: 25000 })
      .expect(201);

    const pledgeId = pledgeResponse.body.id as string;
    expect(pledgeResponse.body).toMatchObject({
      tenantId,
      campaignId,
      pledgedAmountPaise: 25000,
      paidAmountPaise: 0,
      status: 'PLEDGED',
    });

    const paymentResponse = await request(app.getHttpServer())
      .post(`/api/giving/pledges/${pledgeId}/payments`)
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .set('idempotency-key', `payment-${tenantId}`)
      .send({ amountPaise: 25000, method: 'UPI', reference: 'emulator-upi-ref' })
      .expect(201);

    const paymentId = paymentResponse.body.id as string;
    expect(paymentResponse.body.status).toBe('PENDING_APPROVAL');

    const approvalResponse = await request(app.getHttpServer())
      .post(`/api/giving/payments/${paymentId}/approve`)
      .set('Host', host)
      .set('x-test-user', approverSubject)
      .expect(201);

    expect(approvalResponse.body).toMatchObject({
      id: paymentId,
      tenantId,
      pledgeId,
      donorUserId: (await identity.resolve({ subject: donorSubject } as AuthenticatedUser)).id,
      status: 'VERIFIED',
      receiptNumber: expect.stringMatching(/^JCP-/),
    });

    const donorReceiptsResponse = await request(app.getHttpServer())
      .get('/api/giving/my-receipts')
      .set('Host', host)
      .set('x-test-user', donorSubject)
      .expect(200);

    expect(donorReceiptsResponse.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        paymentId,
        pledgeId,
        amountPaise: 25000,
        receiptNumber: approvalResponse.body.receiptNumber,
      }),
    ]));

    const donorPledgesResponse = await request(app.getHttpServer())
      .get('/api/giving/my-pledges')
      .set('Host', host)
      .set('x-test-user', donorSubject)
      .expect(200);

    expect(donorPledgesResponse.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: pledgeId,
        paidAmountPaise: 25000,
        status: 'PAID',
      }),
    ]));

    const persistedPayments = await firestore.listDonationPaymentsForTenant(tenantId);
    const persistedReceipts = await firestore.listDonationReceiptsForTenant(tenantId);
    expect(persistedPayments).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: paymentId, status: 'VERIFIED', receiptNumber: approvalResponse.body.receiptNumber }),
    ]));
    expect(persistedReceipts).toEqual(expect.arrayContaining([
      expect.objectContaining({ paymentId, pledgeId, donorUserId: (await identity.resolve({ subject: donorSubject } as AuthenticatedUser)).id }),
    ]));

    const reconciliation = await firestore.getDonationReconciliationReport(tenantId);
    expect(reconciliation.receipts).toMatchObject({
      issuedReceiptCount: 1,
      missingReceiptPaymentIds: [],
      orphanReceiptPaymentIds: [],
      amountMismatchPaymentIds: [],
      isBalanced: true,
    });
  });

  it('rejects a payment without issuing a receipt or increasing the donor pledge balance', async () => {
    const host = 'giving-emulator.jcp.test';

    const campaignResponse = await request(app.getHttpServer())
      .post('/api/giving/campaigns')
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .send({
        name: 'Rejected payment no-receipt journey',
        description: 'Rejected payment must not create donor receipt history',
        targetAmountPaise: 50000,
      })
      .expect(201);

    const campaignId = campaignResponse.body.id as string;
    await request(app.getHttpServer())
      .patch(`/api/giving/campaigns/${campaignId}/status`)
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .send({ status: 'ACTIVE' })
      .expect(200);

    const pledgeResponse = await request(app.getHttpServer())
      .post('/api/giving/pledges')
      .set('Host', host)
      .set('x-test-user', donorSubject)
      .set('idempotency-key', `rejected-pledge-${tenantId}`)
      .send({ campaignId, pledgedAmountPaise: 25000 })
      .expect(201);
    const pledgeId = pledgeResponse.body.id as string;

    const paymentResponse = await request(app.getHttpServer())
      .post(`/api/giving/pledges/${pledgeId}/payments`)
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .set('idempotency-key', `rejected-payment-${tenantId}`)
      .send({ amountPaise: 10000, method: 'UPI', reference: 'rejected-emulator-upi-ref' })
      .expect(201);
    const paymentId = paymentResponse.body.id as string;
    expect(paymentResponse.body.status).toBe('PENDING_APPROVAL');

    const rejectionResponse = await request(app.getHttpServer())
      .post(`/api/giving/payments/${paymentId}/reject`)
      .set('Host', host)
      .set('x-test-user', approverSubject)
      .send({ reason: 'Payment reference could not be verified' })
      .expect(201);
    expect(rejectionResponse.body).toMatchObject({
      id: paymentId,
      tenantId,
      pledgeId,
      status: 'REJECTED',
    });

    const donorReceiptsResponse = await request(app.getHttpServer())
      .get('/api/giving/my-receipts')
      .set('Host', host)
      .set('x-test-user', donorSubject)
      .expect(200);
    expect(donorReceiptsResponse.body).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ paymentId }),
    ]));

    const donorPledgesResponse = await request(app.getHttpServer())
      .get('/api/giving/my-pledges')
      .set('Host', host)
      .set('x-test-user', donorSubject)
      .expect(200);
    expect(donorPledgesResponse.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: pledgeId,
        paidAmountPaise: 0,
        status: 'PLEDGED',
      }),
    ]));

    const persistedPayments = await firestore.listDonationPaymentsForTenant(tenantId);
    expect(persistedPayments).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: paymentId, status: 'REJECTED' }),
    ]));
    const persistedReceipts = await firestore.listDonationReceiptsForTenant(tenantId);
    expect(persistedReceipts).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ paymentId }),
    ]));
  });

  it('persists an approved refund adjustment and reconciles the reduced donor balance', async () => {
    const host = 'giving-emulator.jcp.test';

    const campaignResponse = await request(app.getHttpServer())
      .post('/api/giving/campaigns')
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .send({
        name: 'Refund adjustment reconciliation',
        description: 'Persist adjustment and net-balance regression',
        targetAmountPaise: 50000,
      })
      .expect(201);
    const campaignId = campaignResponse.body.id as string;

    await request(app.getHttpServer())
      .patch(`/api/giving/campaigns/${campaignId}/status`)
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .send({ status: 'ACTIVE' })
      .expect(200);

    const pledgeResponse = await request(app.getHttpServer())
      .post('/api/giving/pledges')
      .set('Host', host)
      .set('x-test-user', donorSubject)
      .set('idempotency-key', `refund-pledge-${tenantId}`)
      .send({ campaignId, pledgedAmountPaise: 30000 })
      .expect(201);
    const pledgeId = pledgeResponse.body.id as string;

    const paymentResponse = await request(app.getHttpServer())
      .post(`/api/giving/pledges/${pledgeId}/payments`)
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .set('idempotency-key', `refund-payment-${tenantId}`)
      .send({ amountPaise: 20000, method: 'UPI', reference: 'refund-upi-ref' })
      .expect(201);
    const paymentId = paymentResponse.body.id as string;

    const approvalResponse = await request(app.getHttpServer())
      .post(`/api/giving/payments/${paymentId}/approve`)
      .set('Host', host)
      .set('x-test-user', approverSubject)
      .expect(201);
    expect(approvalResponse.body.status).toBe('VERIFIED');

    const adjustmentResponse = await request(app.getHttpServer())
      .post(`/api/giving/payments/${paymentId}/adjustments`)
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .set('idempotency-key', `refund-adjustment-${tenantId}`)
      .send({
        kind: 'REFUND',
        amountPaise: 5000,
        reason: 'Verified duplicate UPI amount',
        reference: 'refund-reference-test',
      })
      .expect(201);
    const adjustmentId = adjustmentResponse.body.id as string;
    expect(adjustmentResponse.body).toMatchObject({
      paymentId,
      pledgeId,
      amountPaise: 5000,
      kind: 'REFUND',
      status: 'PENDING_APPROVAL',
    });

    const approvedAdjustment = await request(app.getHttpServer())
      .post(`/api/giving/adjustments/${adjustmentId}/approve`)
      .set('Host', host)
      .set('x-test-user', approverSubject)
      .expect(201);
    expect(approvedAdjustment.body).toMatchObject({
      id: adjustmentId,
      paymentId,
      pledgeId,
      amountPaise: 5000,
      status: 'APPROVED',
      approvedBy: approverId,
    });
    expect(approvedAdjustment.body.adjustmentNumber).toMatch(/^JCP-ADJ-/);

    const persistedAdjustments = await firestore.listDonationAdjustmentsForTenant(tenantId);
    expect(persistedAdjustments).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: adjustmentId,
        status: 'APPROVED',
        amountPaise: 5000,
        kind: 'REFUND',
        createdBy: operatorId,
        approvedBy: approverId,
      }),
    ]));

    const donorPledgesResponse = await request(app.getHttpServer())
      .get('/api/giving/my-pledges')
      .set('Host', host)
      .set('x-test-user', donorSubject)
      .expect(200);
    expect(donorPledgesResponse.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: pledgeId,
        paidAmountPaise: 15000,
        status: 'PARTIALLY_PAID',
      }),
    ]));

    const persistedReceipts = await firestore.listDonationReceiptsForTenant(tenantId);
    expect(persistedReceipts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        paymentId,
        amountPaise: 20000,
      }),
    ]));

    const reconciliation = await firestore.getDonationReconciliationReport(tenantId);
    expect(reconciliation.receipts).toMatchObject({
      issuedReceiptCount: 2,
      missingReceiptPaymentIds: [],
      orphanReceiptPaymentIds: [],
      amountMismatchPaymentIds: [],
      isBalanced: true,
    });
    expect(reconciliation.adjustments).toMatchObject({
      approvedAmountPaise: 5000,
      approvedCount: 1,
      pendingAmountPaise: 0,
      pendingCount: 0,
    });
    expect(reconciliation.netAfterApprovedExpensesAndAdjustmentsPaise).toBe(40000);
  });

  it('rejects over-adjustment, releases rejected reservations, and persists a reversal', async () => {
    const host = 'giving-emulator.jcp.test';

    const campaignResponse = await request(app.getHttpServer())
      .post('/api/giving/campaigns')
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .send({
        name: 'Adjustment negative-path reconciliation',
        description: 'Pending, rejected and reversal state regression',
        targetAmountPaise: 50000,
      })
      .expect(201);
    const campaignId = campaignResponse.body.id as string;

    await request(app.getHttpServer())
      .patch(`/api/giving/campaigns/${campaignId}/status`)
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .send({ status: 'ACTIVE' })
      .expect(200);

    const pledgeResponse = await request(app.getHttpServer())
      .post('/api/giving/pledges')
      .set('Host', host)
      .set('x-test-user', donorSubject)
      .set('idempotency-key', `negative-adjustment-pledge-${tenantId}`)
      .send({ campaignId, pledgedAmountPaise: 30000 })
      .expect(201);
    const pledgeId = pledgeResponse.body.id as string;

    const paymentResponse = await request(app.getHttpServer())
      .post(`/api/giving/pledges/${pledgeId}/payments`)
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .set('idempotency-key', `negative-adjustment-payment-${tenantId}`)
      .send({ amountPaise: 20000, method: 'UPI', reference: 'negative-adjustment-upi-ref' })
      .expect(201);
    const paymentId = paymentResponse.body.id as string;

    await request(app.getHttpServer())
      .post(`/api/giving/payments/${paymentId}/approve`)
      .set('Host', host)
      .set('x-test-user', approverSubject)
      .expect(201);

    const baselineReport = await firestore.getDonationReconciliationReport(tenantId);
    const pendingAdjustmentResponse = await request(app.getHttpServer())
      .post(`/api/giving/payments/${paymentId}/adjustments`)
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .set('idempotency-key', `pending-adjustment-${tenantId}`)
      .send({
        kind: 'REFUND',
        amountPaise: 15000,
        reason: 'Request refund pending review',
      })
      .expect(201);
    const pendingAdjustmentId = pendingAdjustmentResponse.body.id as string;

    const overAdjustmentResponse = await request(app.getHttpServer())
      .post(`/api/giving/payments/${paymentId}/adjustments`)
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .set('idempotency-key', `over-adjustment-${tenantId}`)
      .send({
        kind: 'REFUND',
        amountPaise: 6000,
        reason: 'Must exceed the remaining payment balance',
      })
      .expect(422);
    expect(overAdjustmentResponse.body.message).toContain('Adjustment exceeds the payment amount');

    const adjustmentsAfterOverRequest = await firestore.listDonationAdjustmentsForTenant(tenantId);
    expect(adjustmentsAfterOverRequest.filter((item) => item.paymentId === paymentId)).toHaveLength(1);
    expect(adjustmentsAfterOverRequest).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: pendingAdjustmentId, status: 'PENDING_APPROVAL', amountPaise: 15000 }),
    ]));

    const rejectionResponse = await request(app.getHttpServer())
      .post(`/api/giving/adjustments/${pendingAdjustmentId}/reject`)
      .set('Host', host)
      .set('x-test-user', approverSubject)
      .send({ reason: 'Supporting refund evidence was insufficient' })
      .expect(201);
    expect(rejectionResponse.body).toMatchObject({
      id: pendingAdjustmentId,
      status: 'REJECTED',
      amountPaise: 15000,
      rejectionReason: 'Supporting refund evidence was insufficient',
      approvedBy: approverId,
    });

    const reportAfterRejection = await firestore.getDonationReconciliationReport(tenantId);
    expect(reportAfterRejection.adjustments).toMatchObject({
      pendingAmountPaise: 0,
      pendingCount: 0,
      rejectedAmountPaise: 15000,
      rejectedCount: 1,
    });
    expect(reportAfterRejection.netAfterApprovedExpensesAndAdjustmentsPaise)
      .toBe(baselineReport.netAfterApprovedExpensesAndAdjustmentsPaise);

    const reversalResponse = await request(app.getHttpServer())
      .post(`/api/giving/payments/${paymentId}/adjustments`)
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .set('idempotency-key', `approved-reversal-${tenantId}`)
      .send({
        kind: 'REVERSAL',
        amountPaise: 5000,
        reason: 'Reverse the verified duplicate portion',
      })
      .expect(201);
    const reversalId = reversalResponse.body.id as string;
    expect(reversalResponse.body.status).toBe('PENDING_APPROVAL');

    const approvedReversal = await request(app.getHttpServer())
      .post(`/api/giving/adjustments/${reversalId}/approve`)
      .set('Host', host)
      .set('x-test-user', approverSubject)
      .expect(201);
    expect(approvedReversal.body).toMatchObject({
      id: reversalId,
      kind: 'REVERSAL',
      status: 'APPROVED',
      amountPaise: 5000,
      approvedBy: approverId,
    });

    const persistedPayment = (await firestore.listDonationPaymentsForTenant(tenantId))
      .find((payment) => payment.id === paymentId);
    expect(persistedPayment).toMatchObject({
      id: paymentId,
      status: 'VERIFIED',
      adjustedAmountPaise: 5000,
      pendingAdjustmentAmountPaise: 0,
    });

    const donorPledgesResponse = await request(app.getHttpServer())
      .get('/api/giving/my-pledges')
      .set('Host', host)
      .set('x-test-user', donorSubject)
      .expect(200);
    expect(donorPledgesResponse.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: pledgeId,
        paidAmountPaise: 15000,
        status: 'PARTIALLY_PAID',
      }),
    ]));

    const finalReport = await firestore.getDonationReconciliationReport(tenantId);
    expect(finalReport.adjustments).toMatchObject({
      approvedAmountPaise: 10000,
      approvedCount: 2,
      pendingAmountPaise: 0,
      pendingCount: 0,
      rejectedAmountPaise: 15000,
      rejectedCount: 1,
    });
    expect(finalReport.netAfterApprovedExpensesAndAdjustmentsPaise)
      .toBe(baselineReport.netAfterApprovedExpensesAndAdjustmentsPaise - 5000);
  });

  it('persists expense maker-checker decisions and reconciles approved versus rejected expenses', async () => {
    const host = 'giving-emulator.jcp.test';
    const baseline = await firestore.getDonationReconciliationReport(tenantId);

    const approvedExpenseResponse = await request(app.getHttpServer())
      .post('/api/giving/expenses')
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .set('idempotency-key', `approved-expense-${tenantId}`)
      .send({
        category: 'MAINTENANCE',
        description: 'Emulator-approved temple maintenance',
        amountPaise: 7000,
        reference: 'maintenance-invoice-test',
      })
      .expect(201);
    const approvedExpenseId = approvedExpenseResponse.body.id as string;
    expect(approvedExpenseResponse.body).toMatchObject({
      tenantId,
      amountPaise: 7000,
      status: 'PENDING_APPROVAL',
      createdBy: operatorId,
    });

    await request(app.getHttpServer())
      .post(`/api/giving/expenses/${approvedExpenseId}/approve`)
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .expect(403);

    expect(await firestore.listDonationExpensesForTenant(tenantId)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: approvedExpenseId, status: 'PENDING_APPROVAL' }),
      ]),
    );

    const approvedExpense = await request(app.getHttpServer())
      .post(`/api/giving/expenses/${approvedExpenseId}/approve`)
      .set('Host', host)
      .set('x-test-user', approverSubject)
      .expect(201);
    expect(approvedExpense.body).toMatchObject({
      id: approvedExpenseId,
      status: 'APPROVED',
      amountPaise: 7000,
      approvedBy: approverId,
    });

    const rejectedExpenseResponse = await request(app.getHttpServer())
      .post('/api/giving/expenses')
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .set('idempotency-key', `rejected-expense-${tenantId}`)
      .send({
        category: 'SUPPLIES',
        description: 'Emulator-rejected supplies expense',
        amountPaise: 3000,
        reference: 'supplies-invoice-test',
      })
      .expect(201);
    const rejectedExpenseId = rejectedExpenseResponse.body.id as string;

    const rejectedExpense = await request(app.getHttpServer())
      .post(`/api/giving/expenses/${rejectedExpenseId}/reject`)
      .set('Host', host)
      .set('x-test-user', approverSubject)
      .send({ reason: 'Supporting invoice was not sufficient' })
      .expect(201);
    expect(rejectedExpense.body).toMatchObject({
      id: rejectedExpenseId,
      status: 'REJECTED',
      amountPaise: 3000,
      approvedBy: approverId,
      rejectionReason: 'Supporting invoice was not sufficient',
    });

    const persistedExpenses = await firestore.listDonationExpensesForTenant(tenantId);
    expect(persistedExpenses).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: approvedExpenseId, status: 'APPROVED', amountPaise: 7000 }),
      expect.objectContaining({ id: rejectedExpenseId, status: 'REJECTED', amountPaise: 3000 }),
    ]));

    const reconciliation = await firestore.getDonationReconciliationReport(tenantId);
    expect(reconciliation.expenses).toMatchObject({
      approvedAmountPaise: 7000,
      approvedCount: 1,
      pendingAmountPaise: 0,
      pendingCount: 0,
      rejectedAmountPaise: 3000,
      rejectedCount: 1,
    });
    expect(reconciliation.netAfterApprovedExpensesPaise)
      .toBe(baseline.netAfterApprovedExpensesPaise - 7000);
    expect(reconciliation.netAfterApprovedExpensesAndAdjustmentsPaise)
      .toBe(baseline.netAfterApprovedExpensesAndAdjustmentsPaise - 7000);
  });

  it('persists finance-role revocation and denies the next protected HTTP request', async () => {
    const host = 'giving-emulator.jcp.test';
    const membershipService = app.get(MembershipService);
    const giving = app.get(GivingService);
    const listExpenses = jest.spyOn(giving, 'listTenantExpenses');

    await request(app.getHttpServer())
      .get('/api/giving/expenses')
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .expect(200);
    expect(listExpenses).toHaveBeenCalledTimes(1);
    expect(listExpenses).toHaveBeenCalledWith(tenantId);

    listExpenses.mockClear();
    await membershipService.revokeFinancialRole(
      operatorId,
      tenantId,
      'FINANCE_OPERATOR',
    );

    await expect(firestore.getMembership(operatorId, tenantId)).resolves.toMatchObject({
      userId: operatorId,
      tenantId,
      role: 'CONTENT_MANAGER',
      roles: ['CONTENT_MANAGER'],
    });

    await request(app.getHttpServer())
      .get('/api/giving/expenses')
      .set('Host', host)
      .set('x-test-user', operatorSubject)
      .expect(403)
      .expect((response) => {
        expect(response.body.message).toBe('Permission denied');
      });

    // Authorization must reject before the finance service reads persisted data.
    expect(listExpenses).not.toHaveBeenCalled();
  });

});
