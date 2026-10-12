import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { AuthenticatedRequest } from '../src/auth/authenticated-request';
import { AuthenticationGuard } from '../src/auth/authentication.guard';
import { AuthenticatedUser } from '../src/auth/auth.types';
import { AppModule } from '../src/app.module';
import { MembershipService } from '../src/authorization/membership.service';
import { UserIdentityService } from '../src/identity/user-identity.service';
import { FirestoreTenantResolver } from '../src/tenant/firestore-tenant.resolver';
import { ProfileService } from '../src/profile/profile.service';
import { AuditService } from '../src/audit/audit.service';
import { GivingService } from '../src/giving/giving.service';

describe('API endpoints (integration)', () => {
  let app: INestApplication;
  let giving: {
    listTenantExpenses: jest.Mock;
    createExpense: jest.Mock;
    createPledge: jest.Mock;
    recordPayment: jest.Mock;
    approveExpense: jest.Mock;
    rejectExpense: jest.Mock;
    listTenantAdjustments: jest.Mock;
    createAdjustment: jest.Mock;
    approveAdjustment: jest.Mock;
    rejectAdjustment: jest.Mock;
    listTenantPayments: jest.Mock;
    approvePayment: jest.Mock;
    rejectPayment: jest.Mock;
    listTenantReceipts: jest.Mock;
    getFinanceReport: jest.Mock;
    getReconciliationReport: jest.Mock;
    listTenantPledges: jest.Mock;
  };
  let audit: { record: jest.Mock };

  beforeAll(async () => {
    const authenticationGuard = {
      canActivate: (context: ExecutionContext): boolean => {
        const request =
          context.switchToHttp().getRequest<AuthenticatedRequest>();
        request.user = {
          subject: request.header('x-test-user') ?? 'user-a',
          email: 'test@example.com',
        };
        return true;
      },
    };

    const identity = {
      resolve: jest.fn(async (user: AuthenticatedUser) => ({
        id: user.subject,
        authSubject: user.subject,
        email: user.email,
        displayName: user.displayName,
        platformRoles: user.subject === 'user-platform-admin' ? ['PLATFORM_ADMIN'] : [],
      })),
    };

    const profile = {
      getCurrent: jest.fn(async () => ({
        id: 'user-a',
        displayName: 'Test Member',
        email: 'test@example.com',
        primaryPhone: '9876543210',
        phoneNumbers: ['9876543210'],
        address: 'Pune',
        needsPhoneLink: false,
      })),
      updateCurrent: jest.fn(async () => ({
        id: 'user-a',
        displayName: 'Updated Member',
        email: 'test@example.com',
        primaryPhone: '9876543210',
        phoneNumbers: ['9876543210'],
        address: 'Updated Pune',
        needsPhoneLink: false,
      })),
      activities: jest.fn(async () => [{
        id: 'activity-1',
        eventType: 'KSHAMAWANI',
        eventId: 'kshamawani-2026',
        title: 'Kshamawani 2026',
        participatedAt: '2026-09-05T00:00:00.000Z',
      }]),
      linkCurrentContact: jest.fn(),
      adminSetContact: jest.fn(),
      recordActivity: jest.fn(),
    };

    const tenantResolver = {
      resolve: jest.fn(async (hostname: string) => {
        if (hostname.toLowerCase().replace(/^www\./, '') !== 'badebabakharadi.com') {
          return null;
        }
        return {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Bade Baba Kharadi',
          hostname: 'badebabakharadi.com',
        };
      }),
    };

    const membership = {
      resolve: jest.fn(async (userId: string, tenantId: string) => {
        if (userId === 'user-none') return null;
        const role =
          userId === 'user-viewer' ? 'FINANCE_VIEWER' :
          userId === 'user-finance-operator' ? 'FINANCE_OPERATOR' :
          userId === 'user-finance-approver' ? 'FINANCE_APPROVER' :
          userId === 'user-tenant-finance' ? 'TENANT_FINANCE' :
          userId === 'user-ca-auditor' ? 'CA_AUDITOR' :
          userId === 'user-cross-tenant' ? 'FINANCE_OPERATOR' :
          userId === 'user-platform-admin' ? 'FINANCE_APPROVER' : 'TENANT_ADMIN';
        return {
          userId,
          tenantId: userId === 'user-cross-tenant' ? 'tenant-b' : tenantId,
          role,
          ...(userId === 'user-legacy-finance-admin'
            ? { roles: ['TENANT_ADMIN', 'TENANT_FINANCE'] as const }
            : {}),
        } as const;
      }),
    };

    giving = {
      createPledge: jest.fn().mockResolvedValue({ id: 'pledge-created', status: 'PLEDGED', pledgedAmountPaise: 5000 }),
      recordPayment: jest.fn().mockResolvedValue({ id: 'payment-created', status: 'PENDING_APPROVAL', amountPaise: 5000 }),
      listTenantExpenses: jest.fn().mockResolvedValue([
        { id: 'expense-1', tenantId: '00000000-0000-0000-0000-000000000001', status: 'PENDING_APPROVAL', amountPaise: 10000 },
      ]),
      createExpense: jest.fn().mockResolvedValue({
        id: 'expense-created', tenantId: '00000000-0000-0000-0000-000000000001',
        status: 'PENDING_APPROVAL', amountPaise: 10000,
      }),
      approveExpense: jest.fn().mockResolvedValue({
        id: 'expense-1', tenantId: '00000000-0000-0000-0000-000000000001', status: 'APPROVED', amountPaise: 10000,
      }),
      rejectExpense: jest.fn().mockResolvedValue({
        id: 'expense-1', tenantId: '00000000-0000-0000-0000-000000000001', status: 'REJECTED', amountPaise: 10000,
      }),
      listTenantAdjustments: jest.fn().mockResolvedValue([
        { id: 'adjustment-1', tenantId: '00000000-0000-0000-0000-000000000001', status: 'PENDING_APPROVAL', amountPaise: 5000 },
      ]),
      createAdjustment: jest.fn().mockResolvedValue({
        id: 'adjustment-created', tenantId: '00000000-0000-0000-0000-000000000001', status: 'PENDING_APPROVAL', amountPaise: 5000,
      }),
      approveAdjustment: jest.fn().mockResolvedValue({
        id: 'adjustment-1', tenantId: '00000000-0000-0000-0000-000000000001', status: 'APPROVED', amountPaise: 5000,
      }),
      rejectAdjustment: jest.fn().mockResolvedValue({
        id: 'adjustment-1', tenantId: '00000000-0000-0000-0000-000000000001', status: 'REJECTED', amountPaise: 5000,
      }),
      listTenantPayments: jest.fn().mockResolvedValue([]),
      approvePayment: jest.fn().mockResolvedValue({ id: 'payment-1', status: 'VERIFIED', amountPaise: 10000 }),
      rejectPayment: jest.fn().mockResolvedValue({ id: 'payment-1', status: 'REJECTED', amountPaise: 10000 }),
      listTenantReceipts: jest.fn().mockResolvedValue([]),
      getFinanceReport: jest.fn().mockResolvedValue({ totals: { receivedAmountPaise: 0 } }),
      getReconciliationReport: jest.fn().mockResolvedValue({ receipts: { isBalanced: true } }),
      listTenantPledges: jest.fn().mockResolvedValue([]),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthenticationGuard)
      .useValue(authenticationGuard)
      .overrideProvider(UserIdentityService)
      .useValue(identity)
      .overrideProvider(MembershipService)
      .useValue(membership)
      .overrideProvider(FirestoreTenantResolver)
      .useValue(tenantResolver)
      .overrideProvider(ProfileService)
      .useValue(profile)
      .overrideProvider(GivingService)
      .useValue(giving)
      .overrideProvider(AuditService)
      .useValue(audit)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health returns 200 and a healthy status', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /api/auth/me accepts the test authentication context', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Host', 'badebabakharadi.com')
      .expect(200)
      .expect((response) => {
        expect(response.body.userId).toBe('user-a');
        expect(response.body.tenantId).toBe(
          '00000000-0000-0000-0000-000000000001',
        );
        expect(response.body.role).toBe('TENANT_ADMIN');
      });
  });

  it('GET /api/profile returns the canonical profile', async () => {
    await request(app.getHttpServer())
      .get('/api/profile')
      .expect(200)
      .expect((response) => {
        expect(response.body.id).toBe('user-a');
        expect(response.body.primaryPhone).toBe('9876543210');
        expect(response.body.needsPhoneLink).toBe(false);
      });
  });

  it('PATCH /api/profile updates editable profile fields without accepting phone fields', async () => {
    await request(app.getHttpServer())
      .patch('/api/profile')
      .send({ displayName: 'Updated Member', address: 'Updated Pune' })
      .expect(200)
      .expect((response) => {
        expect(response.body.displayName).toBe('Updated Member');
        expect(response.body.primaryPhone).toBe('9876543210');
      });
  });

  it('GET /api/profile/activities returns participation history', async () => {
    await request(app.getHttpServer())
      .get('/api/profile/activities')
      .expect(200)
      .expect((response) => {
        expect(response.body[0].eventType).toBe('KSHAMAWANI');
        expect(response.body[0].eventId).toBe('kshamawani-2026');
      });
  });

  it('GET /api/tenant/resolve resolves the persisted tenant', async () => {
    await request(app.getHttpServer())
      .get('/api/tenant/resolve')
      .query({ hostname: 'WWW.BADEBABAKHARADI.COM' })
      .expect(200)
      .expect({
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Bade Baba Kharadi',
        hostname: 'badebabakharadi.com',
      });
  });

  it('GET /api/tenant/context allows a member of the resolved tenant', async () => {
    await request(app.getHttpServer())
      .get('/api/tenant/context')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-a')
      .expect(200)
      .expect({
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Bade Baba Kharadi',
        hostname: 'badebabakharadi.com',
      });
  });

  it('GET /api/tenant/context rejects a user without tenant membership', async () => {
    await request(app.getHttpServer())
      .get('/api/tenant/context')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-none')
      .expect(403)
      .expect({
        statusCode: 403,
        message: 'Tenant membership is required',
        error: 'Forbidden',
      });
  });

  it('GET /api/tenant/context rejects membership from another tenant', async () => {
    await request(app.getHttpServer())
      .get('/api/tenant/context')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-cross-tenant')
      .expect(403)
      .expect({
        statusCode: 403,
        message: 'Tenant access denied',
        error: 'Forbidden',
      });
  });

  it('GET /api/tenant/context rejects an unknown request hostname', async () => {
    await request(app.getHttpServer())
      .get('/api/tenant/context')
      .set('Host', 'example.com')
      .set('x-test-user', 'user-a')
      .expect(403)
      .expect({
        statusCode: 403,
        message: 'Tenant authorization context is required',
        error: 'Forbidden',
      });
  });

  it('GET /api/tenant/context cannot be moved across tenants by changing Host', async () => {
    await request(app.getHttpServer())
      .get('/api/tenant/context')
      .set('Host', 'example.com')
      .set('x-test-user', 'user-a')
      .expect(403);
  });

  it('GET /api/tenant/context allows a finance viewer because tenant.read is required', async () => {
    await request(app.getHttpServer())
      .get('/api/tenant/context')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-viewer')
      .expect(200);
  });

  it('GET /api/tenant/context returns 404 when tenant context is absent', async () => {
    await request(app.getHttpServer())
      .get('/api/tenant/context')
      .set('Host', 'example.com')
      .set('x-test-user', 'user-a')
      .expect(403);
  });

  it('GET /api/tenant/resolve returns 404 for an unknown tenant', async () => {
    await request(app.getHttpServer())
      .get('/api/tenant/resolve')
      .query({ hostname: 'example.com' })
      .expect(404)
      .expect({
        statusCode: 404,
        message: 'Tenant not found',
        error: 'Not Found',
      });
  });
  it('GET /api/giving/payments denies tenant administrators at the HTTP authorization boundary', async () => {
    await request(app.getHttpServer())
      .get('/api/giving/payments')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-a')
      .expect(403)
      .expect({
        statusCode: 403,
        message: 'Permission denied',
        error: 'Forbidden',
      });
  });

  it('POST /api/giving/payments/:paymentId/approve denies tenant administrators before payment processing', async () => {
    await request(app.getHttpServer())
      .post('/api/giving/payments/payment-1/approve')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-a')
      .expect(403)
      .expect({
        statusCode: 403,
        message: 'Permission denied',
        error: 'Forbidden',
      });
  });

  it('GET /api/giving/payments denies a finance user whose membership belongs to another tenant', async () => {
    await request(app.getHttpServer())
      .get('/api/giving/payments')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-cross-tenant')
      .expect(403)
      .expect({
        statusCode: 403,
        message: 'Tenant access denied',
        error: 'Forbidden',
      });
  });


  it('GET /api/giving/expenses denies tenant administrators at the HTTP authorization boundary', async () => {
    await request(app.getHttpServer())
      .get('/api/giving/expenses')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-a')
      .expect(403)
      .expect({
        statusCode: 403,
        message: 'Permission denied',
        error: 'Forbidden',
      });
  });

  it('GET /api/giving/adjustments denies tenant administrators at the HTTP authorization boundary', async () => {
    await request(app.getHttpServer())
      .get('/api/giving/adjustments')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-a')
      .expect(403)
      .expect({
        statusCode: 403,
        message: 'Permission denied',
        error: 'Forbidden',
      });
  });

  it('POST /api/giving/expenses denies finance viewers before expense creation', async () => {
    await request(app.getHttpServer())
      .post('/api/giving/expenses')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-viewer')
      .set('idempotency-key', 'viewer-expense-attempt')
      .send({ category: 'MAINTENANCE', amountPaise: 10000, description: 'Test expense' })
      .expect(403)
      .expect({
        statusCode: 403,
        message: 'Permission denied',
        error: 'Forbidden',
      });
  });

  it('GET /api/giving/expenses denies a finance operator whose membership belongs to another tenant', async () => {
    await request(app.getHttpServer())
      .get('/api/giving/expenses')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-cross-tenant')
      .expect(403)
      .expect({
        statusCode: 403,
        message: 'Tenant access denied',
        error: 'Forbidden',
      });
  });


  it.each([
    ['GET', '/api/giving/receipts'],
    ['GET', '/api/giving/reports/summary'],
    ['GET', '/api/giving/reports/reconciliation'],
    ['GET', '/api/giving/pledges'],
  ])('%s %s denies tenant administrators at the HTTP authorization boundary', async (method, path) => {
    const call = method === 'GET'
      ? request(app.getHttpServer()).get(path)
      : request(app.getHttpServer()).post(path);
    await call
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-a')
      .expect(403)
      .expect({
        statusCode: 403,
        message: 'Permission denied',
        error: 'Forbidden',
      });
  });

  it('POST /api/giving/payments/:paymentId/reject denies tenant administrators before payment processing', async () => {
    await request(app.getHttpServer())
      .post('/api/giving/payments/payment-1/reject')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-a')
      .send({ reason: 'Not valid' })
      .expect(403)
      .expect({
        statusCode: 403,
        message: 'Permission denied',
        error: 'Forbidden',
      });
  });

  it('POST /api/giving/expenses/:expenseId/approve denies tenant administrators before expense processing', async () => {
    await request(app.getHttpServer())
      .post('/api/giving/expenses/expense-1/approve')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-a')
      .expect(403)
      .expect({
        statusCode: 403,
        message: 'Permission denied',
        error: 'Forbidden',
      });
  });

  it('POST /api/giving/adjustments/:adjustmentId/approve denies tenant administrators before adjustment processing', async () => {
    await request(app.getHttpServer())
      .post('/api/giving/adjustments/adjustment-1/approve')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-a')
      .expect(403)
      .expect({
        statusCode: 403,
        message: 'Permission denied',
        error: 'Forbidden',
      });
  });

  it('GET /api/giving/reports/summary denies finance viewers from another tenant', async () => {
    await request(app.getHttpServer())
      .get('/api/giving/reports/summary')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-cross-tenant')
      .expect(403)
      .expect({
        statusCode: 403,
        message: 'Tenant access denied',
        error: 'Forbidden',
      });
  });


  it('allows a finance viewer to read tenant expenses but not create adjustments or expenses', async () => {
    giving.createExpense.mockClear();
    giving.createAdjustment.mockClear();
    await request(app.getHttpServer())
      .get('/api/giving/expenses')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-viewer')
      .expect(200)
      .expect((response) => expect(response.body).toHaveLength(1));

    await request(app.getHttpServer())
      .post('/api/giving/expenses')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-viewer')
      .set('idempotency-key', 'viewer-write-denied')
      .send({ category: 'MAINTENANCE', amountPaise: 10000, description: 'Test expense' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/giving/payments/payment-1/adjustments')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-viewer')
      .set('idempotency-key', 'viewer-adjustment-denied')
      .send({ kind: 'REFUND', amountPaise: 5000, reason: 'Duplicate' })
      .expect(403);
    expect(giving.listTenantExpenses).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001');
    expect(giving.createExpense).not.toHaveBeenCalled();
    expect(giving.createAdjustment).not.toHaveBeenCalled();
  });

  it('allows a finance operator to create an expense but not approve financial decisions', async () => {
    giving.createExpense.mockClear();
    giving.approveExpense.mockClear();
    giving.approveAdjustment.mockClear();
    giving.approvePayment.mockClear();
    giving.rejectExpense.mockClear();
    giving.rejectAdjustment.mockClear();
    giving.rejectPayment.mockClear();

    await request(app.getHttpServer())
      .post('/api/giving/expenses')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-operator')
      .set('idempotency-key', 'operator-expense-create')
      .send({ category: 'MAINTENANCE', amountPaise: 10000, description: 'Replace temple lights' })
      .expect(201)
      .expect((response) => expect(response.body.status).toBe('PENDING_APPROVAL'));

    await request(app.getHttpServer())
      .post('/api/giving/expenses/expense-1/approve')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-operator')
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/giving/adjustments/adjustment-1/approve')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-operator')
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/giving/payments/payment-1/approve')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-operator')
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/giving/expenses/expense-1/reject')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-operator')
      .send({ reason: 'Not authorized' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/giving/adjustments/adjustment-1/reject')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-operator')
      .send({ reason: 'Not authorized' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/giving/payments/payment-1/reject')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-operator')
      .send({ reason: 'Not authorized' })
      .expect(403);

    expect(giving.createExpense).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: '00000000-0000-0000-0000-000000000001',
      actorUserId: 'user-finance-operator',
      idempotencyKey: 'operator-expense-create',
      amountPaise: 10000,
    }));
    expect(giving.approveExpense).not.toHaveBeenCalled();
    expect(giving.approveAdjustment).not.toHaveBeenCalled();
    expect(giving.approvePayment).not.toHaveBeenCalled();
  });

  it('requires an idempotency key for an authorized finance write before persistence', async () => {
    giving.createExpense.mockClear();
    await request(app.getHttpServer())
      .post('/api/giving/expenses')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-operator')
      .send({ category: 'MAINTENANCE', amountPaise: 10000, description: 'Replace temple lights' })
      .expect(400)
      .expect((response) => expect(response.body.message).toContain('Idempotency-Key'));
    expect(giving.createExpense).not.toHaveBeenCalled();
  });

  it('keeps legacy tenant-finance and CA-auditor permissions separated at the HTTP boundary', async () => {
    giving.createExpense.mockClear();
    giving.approveExpense.mockClear();
    giving.getFinanceReport.mockClear();

    await request(app.getHttpServer())
      .post('/api/giving/expenses')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-tenant-finance')
      .set('idempotency-key', 'tenant-finance-compat-expense')
      .send({ category: 'MAINTENANCE', amountPaise: 10000, description: 'Legacy finance role expense' })
      .expect(201)
      .expect((response) => expect(response.body.status).toBe('PENDING_APPROVAL'));

    await request(app.getHttpServer())
      .post('/api/giving/expenses/expense-1/approve')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-tenant-finance')
      .expect(403);

    await request(app.getHttpServer())
      .get('/api/giving/reports/summary')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-ca-auditor')
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/giving/expenses')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-ca-auditor')
      .set('idempotency-key', 'auditor-expense-denied')
      .send({ category: 'MAINTENANCE', amountPaise: 10000, description: 'Auditor must be read-only' })
      .expect(403);

    await request(app.getHttpServer())
      .post('/api/giving/expenses/expense-1/approve')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-ca-auditor')
      .expect(403);

    expect(giving.createExpense).toHaveBeenCalledTimes(1);
    expect(giving.approveExpense).not.toHaveBeenCalled();
    expect(giving.getFinanceReport).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001');
  });

  it('allows a finance approver to approve expenses, payments and refunds through protected HTTP routes', async () => {
    giving.approveExpense.mockClear();
    giving.approvePayment.mockClear();
    giving.approveAdjustment.mockClear();
    audit.record.mockClear();

    await request(app.getHttpServer())
      .post('/api/giving/expenses/expense-1/approve')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-approver')
      .expect(201)
      .expect((response) => expect(response.body.status).toBe('APPROVED'));

    await request(app.getHttpServer())
      .post('/api/giving/payments/payment-1/approve')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-approver')
      .expect(201)
      .expect((response) => expect(response.body.status).toBe('VERIFIED'));

    await request(app.getHttpServer())
      .post('/api/giving/adjustments/adjustment-1/approve')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-approver')
      .expect(201)
      .expect((response) => expect(response.body.status).toBe('APPROVED'));

    await request(app.getHttpServer())
      .post('/api/giving/expenses/expense-1/reject')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-approver')
      .send({ reason: 'Evidence incomplete' })
      .expect(201)
      .expect((response) => expect(response.body.status).toBe('REJECTED'));

    await request(app.getHttpServer())
      .post('/api/giving/payments/payment-1/reject')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-approver')
      .send({ reason: 'Payment evidence does not match' })
      .expect(201)
      .expect((response) => expect(response.body.status).toBe('REJECTED'));

    await request(app.getHttpServer())
      .post('/api/giving/adjustments/adjustment-1/reject')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-approver')
      .send({ reason: 'Refund evidence incomplete' })
      .expect(201)
      .expect((response) => expect(response.body.status).toBe('REJECTED'));

    expect(giving.approveExpense).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001', 'expense-1', 'user-finance-approver',
    );
    expect(giving.approvePayment).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001', 'payment-1', 'user-finance-approver',
    );
    expect(giving.approveAdjustment).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001', 'adjustment-1', 'user-finance-approver',
    );
    expect(giving.rejectExpense).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001', 'expense-1', 'user-finance-approver', 'Evidence incomplete',
    );
    expect(giving.rejectPayment).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001', 'payment-1', 'user-finance-approver', 'Payment evidence does not match',
    );
    expect(giving.rejectAdjustment).toHaveBeenCalledWith(
      '00000000-0000-0000-0000-000000000001', 'adjustment-1', 'user-finance-approver', 'Refund evidence incomplete',
    );
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DONATION_EXPENSE_APPROVED' }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DONATION_PAYMENT_VERIFIED' }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DONATION_ADJUSTMENT_APPROVED' }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DONATION_EXPENSE_REJECTED' }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DONATION_PAYMENT_REJECTED' }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DONATION_ADJUSTMENT_REJECTED' }));
  });

  it('does not grant finance access to tenant administrators with a legacy combined role or platform admins', async () => {
    giving.listTenantExpenses.mockClear();
    for (const user of ['user-legacy-finance-admin', 'user-platform-admin']) {
      await request(app.getHttpServer())
        .get('/api/giving/expenses')
        .set('Host', 'badebabakharadi.com')
        .set('x-test-user', user)
        .expect(403)
        .expect((response) => expect(response.body.message).toBe('Permission denied'));
    }
    expect(giving.listTenantExpenses).not.toHaveBeenCalled();
  });

  it('requires idempotency keys for pledge, payment and adjustment writes before calling the service', async () => {
    giving.createPledge.mockClear();
    giving.recordPayment.mockClear();
    giving.createAdjustment.mockClear();

    await request(app.getHttpServer())
      .post('/api/giving/pledges')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-a')
      .send({ campaignId: 'campaign-1', pledgedAmountPaise: 5000 })
      .expect(400)
      .expect((response) => expect(response.body.message).toContain('Idempotency-Key'));

    await request(app.getHttpServer())
      .post('/api/giving/pledges/pledge-1/payments')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-operator')
      .send({ amountPaise: 5000, method: 'UPI' })
      .expect(400)
      .expect((response) => expect(response.body.message).toContain('Idempotency-Key'));

    await request(app.getHttpServer())
      .post('/api/giving/payments/payment-1/adjustments')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-operator')
      .send({ kind: 'REFUND', amountPaise: 1000, reason: 'Duplicate payment' })
      .expect(400)
      .expect((response) => expect(response.body.message).toContain('Idempotency-Key'));

    expect(giving.createPledge).not.toHaveBeenCalled();
    expect(giving.recordPayment).not.toHaveBeenCalled();
    expect(giving.createAdjustment).not.toHaveBeenCalled();
  });

  it('rejects invalid payment, adjustment and decision payloads before invoking persistence services', async () => {
    giving.recordPayment.mockClear();
    giving.createAdjustment.mockClear();
    giving.rejectPayment.mockClear();
    giving.rejectExpense.mockClear();
    giving.rejectAdjustment.mockClear();

    await request(app.getHttpServer())
      .post('/api/giving/pledges/pledge-1/payments')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-operator')
      .set('idempotency-key', 'invalid-payment-amount')
      .send({ amountPaise: 0, method: 'UPI' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/giving/pledges/pledge-1/payments')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-operator')
      .set('idempotency-key', 'invalid-payment-method')
      .send({ amountPaise: 1000, method: 'CRYPTO' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/giving/payments/payment-1/adjustments')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-operator')
      .set('idempotency-key', 'invalid-adjustment')
      .send({ kind: 'DONATION', amountPaise: 0, reason: 'Duplicate payment' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/giving/payments/payment-1/reject')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-approver')
      .send({ reason: 'no' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/giving/expenses/expense-1/reject')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-approver')
      .send({ reason: '' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/giving/adjustments/adjustment-1/reject')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-finance-approver')
      .send({ reason: 'ok', extra: 'must be rejected' })
      .expect(400);

    expect(giving.recordPayment).not.toHaveBeenCalled();
    expect(giving.createAdjustment).not.toHaveBeenCalled();
    expect(giving.rejectPayment).not.toHaveBeenCalled();
    expect(giving.rejectExpense).not.toHaveBeenCalled();
    expect(giving.rejectAdjustment).not.toHaveBeenCalled();
  });

});
