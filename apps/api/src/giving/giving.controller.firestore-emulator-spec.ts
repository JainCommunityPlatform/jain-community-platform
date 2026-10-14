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
  let operatorId: string;
  let approverId: string;

  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error('FIRESTORE_EMULATOR_HOST must point to the local Firestore emulator');
    }

    process.env.NODE_ENV = 'test';
    process.env.FIREBASE_PROJECT_ID = 'demo-jcp';
    process.env.FIRESTORE_DATABASE_ID = '(default)';

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    tenantId = `emulator-http-giving-${suffix}`;
    donorSubject = `donor-${suffix}`;
    operatorSubject = `operator-${suffix}`;
    approverSubject = `approver-${suffix}`;

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

    const membership = {
      resolve: async (userId: string, requestedTenantId: string) => {
        if (requestedTenantId !== tenantId) return null;
        if (userId === operatorId) {
          return {
            userId,
            tenantId,
            role: 'FINANCE_OPERATOR',
            roles: ['FINANCE_OPERATOR'],
          };
        }
        if (userId === approverId) {
          return {
            userId,
            tenantId,
            role: 'FINANCE_APPROVER',
            roles: ['FINANCE_APPROVER'],
          };
        }
        return null;
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthenticationGuard)
      .useValue(authenticationGuard)
      .overrideProvider(FirestoreTenantResolver)
      .useValue(tenantResolver)
      .overrideProvider(MembershipService)
      .useValue(membership)
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
    await identity.resolve({ subject: donorSubject, email: `${donorSubject}@example.test` } as AuthenticatedUser);
    operatorId = operator.id;
    approverId = approver.id;
  });

  afterAll(async () => {
    if (app) await app.close();
    const firebaseApp = getApps().find((candidate) => candidate.name === '[DEFAULT]');
    if (firebaseApp) await deleteApp(firebaseApp);
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
});
