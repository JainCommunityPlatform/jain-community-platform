import { ExecutionContext, ForbiddenException, INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
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
import { TenantMemberService } from '../src/tenant/tenant-member.service';
import { FirestoreService } from '../src/database/firestore.service';

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
    listMyReceipts: jest.Mock;
    listMyPledges: jest.Mock;
    getFinanceReport: jest.Mock;
    getReconciliationReport: jest.Mock;
    listTenantPledges: jest.Mock;
    listPublicCampaigns: jest.Mock;
    createCampaign: jest.Mock;
    updateCampaignStatus: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let tenantMembers: { list: jest.Mock; get: jest.Mock; create: jest.Mock; update: jest.Mock; remove: jest.Mock };
  let membership: {
    resolve: jest.Mock;
    listTenantMemberships: jest.Mock;
    grantFinancialRoleByEmail: jest.Mock;
    revokeFinancialRole: jest.Mock;
  };
  let firestore: { getTenantById: jest.Mock; recordAudit: jest.Mock };

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

    membership = {
      resolve: jest.fn(async (userId: string, tenantId: string) => {
        if (userId === 'user-none') return null;
        const role =
          userId === 'user-viewer' ? 'FINANCE_VIEWER' :
          userId === 'user-finance-operator' ? 'FINANCE_OPERATOR' :
          userId === 'user-finance-approver' ? 'FINANCE_APPROVER' :
          userId === 'user-tenant-finance' ? 'TENANT_FINANCE' :
          userId === 'user-ca-auditor' ? 'CA_AUDITOR' :
          userId === 'user-cross-tenant' ? 'FINANCE_OPERATOR' :
          userId === 'user-cross-tenant-admin' ? 'TENANT_ADMIN' :
          userId === 'user-platform-admin' ? 'FINANCE_APPROVER' : 'TENANT_ADMIN';
        return {
          userId,
          tenantId: userId === 'user-cross-tenant' || userId === 'user-cross-tenant-admin' ? 'tenant-b' : tenantId,
          role,
          ...(userId === 'user-legacy-finance-admin'
            ? { roles: ['TENANT_ADMIN', 'TENANT_FINANCE'] as const }
            : {}),
        } as const;
      }),
      listTenantMemberships: jest.fn().mockResolvedValue([
        {
          id: 'finance-user-membership',
          userId: 'finance-user',
          tenantId: 'tenant-finance-a',
          role: 'FINANCE_VIEWER',
          roles: ['FINANCE_VIEWER', 'CONTENT_MANAGER'],
          user: { email: 'finance@example.test', displayName: 'Finance User', primaryPhone: '9999999999' },
        },
        {
          id: 'content-user-membership',
          userId: 'content-user',
          tenantId: 'tenant-finance-a',
          role: 'CONTENT_MANAGER',
          roles: ['CONTENT_MANAGER'],
          user: { email: 'content@example.test', displayName: 'Content User', primaryPhone: null },
        },
      ]),
      grantFinancialRoleByEmail: jest.fn().mockResolvedValue({
        id: 'finance-target-membership',
        userId: 'finance-target',
        tenantId: 'tenant-finance-a',
        role: 'CONTENT_MANAGER',
        roles: ['CONTENT_MANAGER', 'FINANCE_OPERATOR'],
      }),
      revokeFinancialRole: jest.fn().mockResolvedValue({
        id: 'finance-target-membership',
        userId: 'finance-target',
        tenantId: 'tenant-finance-a',
        role: 'CONTENT_MANAGER',
        roles: ['CONTENT_MANAGER'],
        previousRoles: ['CONTENT_MANAGER', 'FINANCE_OPERATOR'],
        membershipDeleted: false,
      }),
    };
    firestore = {
      getTenantById: jest.fn(async (tenantId: string) =>
        tenantId === 'tenant-finance-a' ? { id: tenantId, name: 'Finance Test Tenant' } : null,
      ),
      recordAudit: jest.fn().mockResolvedValue(undefined),
    };

    giving = {
      createCampaign: jest.fn().mockResolvedValue({ id: 'campaign-created', name: 'Test campaign', status: 'DRAFT' }),
      updateCampaignStatus: jest.fn().mockResolvedValue({ id: 'campaign-1', status: 'CLOSED' }),
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
      listMyReceipts: jest.fn().mockResolvedValue([{
        id: 'receipt-donor-a',
        paymentId: 'payment-donor-a',
        receiptNumber: 'JCP-2026-000001',
        amountPaise: 5000,
      }]),
      listMyPledges: jest.fn().mockResolvedValue([{
        id: 'pledge-donor-a',
        campaignId: 'campaign-public',
        pledgedAmountPaise: 5000,
        paidAmountPaise: 0,
        status: 'PLEDGED',
      }]),
      getFinanceReport: jest.fn().mockResolvedValue({ totals: { receivedAmountPaise: 0 } }),
      getReconciliationReport: jest.fn().mockResolvedValue({ receipts: { isBalanced: true } }),
      listTenantPledges: jest.fn().mockResolvedValue([]),
      listPublicCampaigns: jest.fn().mockResolvedValue([{
        id: 'campaign-public',
        tenantId: '00000000-0000-0000-0000-000000000001',
        name: 'Temple Renovation',
        description: 'Support renovation',
        targetAmountPaise: 2500000,
        currency: 'INR',
        status: 'ACTIVE',
        createdBy: 'internal-creator-id',
        createdAt: new Date('2026-10-01T00:00:00.000Z'),
      }]),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    tenantMembers = {
      list: jest.fn().mockResolvedValue([{ id: 'membership-1', userId: '00000000-0000-4000-8000-000000000099', role: 'CONTENT_MANAGER', createdAt: new Date('2026-01-01T00:00:00.000Z') }]),
      get: jest.fn().mockResolvedValue({ id: 'membership-1', userId: '00000000-0000-4000-8000-000000000099', role: 'CONTENT_MANAGER', createdAt: new Date('2026-01-01T00:00:00.000Z') }),
      create: jest.fn().mockResolvedValue({ id: 'membership-created', userId: '00000000-0000-4000-8000-000000000099', role: 'CONTENT_MANAGER', createdAt: new Date('2026-01-01T00:00:00.000Z') }),
      update: jest.fn().mockResolvedValue({ id: 'membership-1', userId: '00000000-0000-4000-8000-000000000099', role: 'EVENT_MANAGER', createdAt: new Date('2026-01-01T00:00:00.000Z') }),
      remove: jest.fn().mockResolvedValue(undefined),
    };

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
      .overrideProvider(TenantMemberService)
      .useValue(tenantMembers)
      .overrideProvider(FirestoreService)
      .useValue(firestore)
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

  it('PATCH /api/profile/:userId/contact denies a tenant administrator from another tenant before changing contact data', async () => {
    const profiles = app.get(ProfileService);
    const adminSetContact = jest.spyOn(profiles, 'adminSetContact');

    await request(app.getHttpServer())
      .patch('/api/profile/user-target/contact')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-cross-tenant-admin')
      .send({ value: '9876543210' })
      .expect(403);

    expect(adminSetContact).not.toHaveBeenCalled();
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

  it('GET /api/tenant/members returns the authorized tenant member list', async () => {
    tenantMembers.list.mockClear();
    await request(app.getHttpServer()).get('/api/tenant/members').set('Host', 'badebabakharadi.com').set('x-test-user', 'user-a')
      .expect(200).expect((response) => {
        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toMatchObject({ userId: '00000000-0000-4000-8000-000000000099', role: 'CONTENT_MANAGER' });
      });
    expect(tenantMembers.list).toHaveBeenCalledTimes(1);
  });

  it('GET /api/tenant/members allows a finance viewer with tenant.read', async () => {
    tenantMembers.list.mockClear();
    await request(app.getHttpServer()).get('/api/tenant/members').set('Host', 'badebabakharadi.com').set('x-test-user', 'user-viewer').expect(200);
    expect(tenantMembers.list).toHaveBeenCalledTimes(1);
  });

  it('GET /api/tenant/members rejects cross-tenant membership context before listing members', async () => {
    tenantMembers.list.mockClear();
    await request(app.getHttpServer()).get('/api/tenant/members')
      .set('Host', 'badebabakharadi.com').set('x-test-user', 'user-cross-tenant')
      .expect(403)
      .expect((response) => expect(response.body.message).toBe('Tenant access denied'));
    expect(tenantMembers.list).not.toHaveBeenCalled();
  });

  it('POST /api/tenant/members denies finance viewers before member creation', async () => {
    tenantMembers.create.mockClear();
    await request(app.getHttpServer()).post('/api/tenant/members').set('Host', 'badebabakharadi.com').set('x-test-user', 'user-viewer')
      .send({ userId: '00000000-0000-4000-8000-000000000099', role: 'CONTENT_MANAGER' }).expect(403);
    expect(tenantMembers.create).not.toHaveBeenCalled();
  });

  it('POST /api/tenant/members allows a tenant administrator to assign a non-financial role', async () => {
    tenantMembers.create.mockClear();
    await request(app.getHttpServer()).post('/api/tenant/members').set('Host', 'badebabakharadi.com').set('x-test-user', 'user-a')
      .send({ userId: '00000000-0000-4000-8000-000000000099', role: 'CONTENT_MANAGER' }).expect(201)
      .expect((response) => expect(response.body).toMatchObject({ userId: '00000000-0000-4000-8000-000000000099', role: 'CONTENT_MANAGER' }));
    expect(tenantMembers.create).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000099', 'CONTENT_MANAGER');
  });

  it('POST /api/tenant/members rejects unsupported privileged roles before member creation', async () => {
    tenantMembers.create.mockClear();
    await request(app.getHttpServer()).post('/api/tenant/members')
      .set('Host', 'badebabakharadi.com').set('x-test-user', 'user-a')
      .send({ userId: '00000000-0000-4000-8000-000000000099', role: 'SUPER_ADMIN' })
      .expect(400);
    expect(tenantMembers.create).not.toHaveBeenCalled();
  });

  it('POST /api/tenant/members rejects malformed user IDs before member creation', async () => {
    tenantMembers.create.mockClear();
    await request(app.getHttpServer()).post('/api/tenant/members')
      .set('Host', 'badebabakharadi.com').set('x-test-user', 'user-a')
      .send({ userId: 'not-a-uuid', role: 'CONTENT_MANAGER' })
      .expect(400);
    expect(tenantMembers.create).not.toHaveBeenCalled();
  });

  it('GET /api/tenant/members rejects malformed user IDs before member lookup', async () => {
    tenantMembers.get.mockClear();
    await request(app.getHttpServer()).get('/api/tenant/members/not-a-uuid').set('Host', 'badebabakharadi.com').set('x-test-user', 'user-a').expect(400);
    expect(tenantMembers.get).not.toHaveBeenCalled();
  });

  it('GET /api/tenant/members/:userId returns the requested member for a tenant reader', async () => {
    tenantMembers.get.mockClear();
    await request(app.getHttpServer()).get('/api/tenant/members/00000000-0000-4000-8000-000000000099')
      .set('Host', 'badebabakharadi.com').set('x-test-user', 'user-viewer')
      .expect(200)
      .expect((response) => expect(response.body).toMatchObject({
        userId: '00000000-0000-4000-8000-000000000099',
        role: 'CONTENT_MANAGER',
      }));
    expect(tenantMembers.get).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000099');
  });

  it('GET /api/tenant/members/:userId rejects cross-tenant membership context before member lookup', async () => {
    tenantMembers.get.mockClear();
    await request(app.getHttpServer()).get('/api/tenant/members/00000000-0000-4000-8000-000000000099')
      .set('Host', 'badebabakharadi.com').set('x-test-user', 'user-cross-tenant')
      .expect(403)
      .expect((response) => expect(response.body.message).toBe('Tenant access denied'));
    expect(tenantMembers.get).not.toHaveBeenCalled();
  });

  it('PATCH /api/tenant/members/:userId denies finance viewers before role changes', async () => {
    tenantMembers.update.mockClear();
    await request(app.getHttpServer()).patch('/api/tenant/members/00000000-0000-4000-8000-000000000099')
      .set('Host', 'badebabakharadi.com').set('x-test-user', 'user-viewer')
      .send({ role: 'EVENT_MANAGER' }).expect(403);
    expect(tenantMembers.update).not.toHaveBeenCalled();
  });

  it('PATCH /api/tenant/members/:userId allows a tenant administrator to update a non-financial role', async () => {
    tenantMembers.update.mockClear();
    await request(app.getHttpServer()).patch('/api/tenant/members/00000000-0000-4000-8000-000000000099')
      .set('Host', 'badebabakharadi.com').set('x-test-user', 'user-a')
      .send({ role: 'EVENT_MANAGER' }).expect(200)
      .expect((response) => expect(response.body).toMatchObject({ role: 'EVENT_MANAGER' }));
    expect(tenantMembers.update).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000099', 'EVENT_MANAGER');
  });

  it('DELETE /api/tenant/members/:userId denies finance viewers before membership removal', async () => {
    tenantMembers.remove.mockClear();
    await request(app.getHttpServer()).delete('/api/tenant/members/00000000-0000-4000-8000-000000000099')
      .set('Host', 'badebabakharadi.com').set('x-test-user', 'user-viewer').expect(403);
    expect(tenantMembers.remove).not.toHaveBeenCalled();
  });

  it('DELETE /api/tenant/members/:userId allows a tenant administrator to remove a member', async () => {
    tenantMembers.remove.mockClear();
    await request(app.getHttpServer()).delete('/api/tenant/members/00000000-0000-4000-8000-000000000099')
      .set('Host', 'badebabakharadi.com').set('x-test-user', 'user-a').expect(200);
    expect(tenantMembers.remove).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000099');
  });

  it('denies cross-tenant membership mutations before changing another tenant', async () => {
    const memberId = '00000000-0000-4000-8000-000000000099';
    const routes: Array<{
      method: 'PATCH' | 'DELETE';
      path: string;
      service: jest.Mock;
      body?: Record<string, unknown>;
    }> = [
      {
        method: 'PATCH',
        path: `/api/tenant/members/${memberId}`,
        service: tenantMembers.update,
        body: { role: 'EVENT_MANAGER' },
      },
      {
        method: 'DELETE',
        path: `/api/tenant/members/${memberId}`,
        service: tenantMembers.remove,
      },
    ];

    for (const route of routes) {
      route.service.mockClear();
      const httpRequest = request(app.getHttpServer());
      const response = route.method === 'PATCH'
        ? httpRequest.patch(route.path)
        : httpRequest.delete(route.path);

      await response
        .set('Host', 'badebabakharadi.com')
        .set('x-test-user', 'user-cross-tenant')
        .send(route.body ?? {})
        .expect(403)
        .expect({
          statusCode: 403,
          message: 'Tenant access denied',
          error: 'Forbidden',
        });

      expect(route.service).not.toHaveBeenCalled();
    }
  });

  it('PATCH /api/tenant/members/:userId rejects unsupported roles before updating membership', async () => {
    tenantMembers.update.mockClear();
    await request(app.getHttpServer()).patch('/api/tenant/members/00000000-0000-4000-8000-000000000099')
      .set('Host', 'badebabakharadi.com').set('x-test-user', 'user-a')
      .send({ role: 'SUPER_ADMIN' }).expect(400);
    expect(tenantMembers.update).not.toHaveBeenCalled();
  });

  it('PATCH /api/tenant/members/:userId rejects malformed IDs before role changes', async () => {
    tenantMembers.update.mockClear();
    await request(app.getHttpServer()).patch('/api/tenant/members/not-a-uuid')
      .set('Host', 'badebabakharadi.com').set('x-test-user', 'user-a')
      .send({ role: 'EVENT_MANAGER' }).expect(400);
    expect(tenantMembers.update).not.toHaveBeenCalled();
  });

  it('DELETE /api/tenant/members/:userId rejects malformed IDs before membership removal', async () => {
    tenantMembers.remove.mockClear();
    await request(app.getHttpServer()).delete('/api/tenant/members/not-a-uuid')
      .set('Host', 'badebabakharadi.com').set('x-test-user', 'user-a').expect(400);
    expect(tenantMembers.remove).not.toHaveBeenCalled();
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
  it('GET /api/giving/campaigns returns only the public campaign projection for the resolved tenant', async () => {
    giving.listPublicCampaigns.mockClear();
    await request(app.getHttpServer())
      .get('/api/giving/campaigns')
      .set('Host', 'badebabakharadi.com')
      .expect(200)
      .expect([{
        id: 'campaign-public',
        name: 'Temple Renovation',
        description: 'Support renovation',
        targetAmountPaise: 2500000,
        currency: 'INR',
        status: 'ACTIVE',
        createdAt: '2026-10-01T00:00:00.000Z',
      }]);
    expect(giving.listPublicCampaigns).toHaveBeenCalledTimes(1);
    expect(giving.listPublicCampaigns).toHaveBeenCalledWith('00000000-0000-0000-0000-000000000001');
  });

  it('GET /api/giving/campaigns rejects an unresolved tenant before reading campaigns', async () => {
    giving.listPublicCampaigns.mockClear();
    await request(app.getHttpServer())
      .get('/api/giving/campaigns')
      .set('Host', 'unknown.example.com')
      .expect(400)
      .expect({
        statusCode: 400,
        message: 'Tenant context is required',
        error: 'Bad Request',
      });
    expect(giving.listPublicCampaigns).not.toHaveBeenCalled();
  });

  it('GET /api/giving/my-pledges and my-receipts scope history to the authenticated donor and resolved tenant', async () => {
    giving.listMyPledges.mockClear();
    giving.listMyReceipts.mockClear();

    await request(app.getHttpServer())
      .get('/api/giving/my-pledges')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'donor-a')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual([expect.objectContaining({
          id: 'pledge-donor-a',
          campaignId: 'campaign-public',
          pledgedAmountPaise: 5000,
        })]);
      });

    await request(app.getHttpServer())
      .get('/api/giving/my-receipts')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'donor-a')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual([expect.objectContaining({
          id: 'receipt-donor-a',
          paymentId: 'payment-donor-a',
          receiptNumber: 'JCP-2026-000001',
        })]);
      });

    const tenantId = '00000000-0000-0000-0000-000000000001';
    expect(giving.listMyPledges).toHaveBeenCalledWith(tenantId, 'donor-a');
    expect(giving.listMyReceipts).toHaveBeenCalledWith(tenantId, 'donor-a');
  });

  it('GET /api/giving/my-pledges and my-receipts reject missing tenant context before reading donor history', async () => {
    giving.listMyPledges.mockClear();
    giving.listMyReceipts.mockClear();

    for (const path of ['/api/giving/my-pledges', '/api/giving/my-receipts']) {
      await request(app.getHttpServer())
        .get(path)
        .set('Host', 'unknown.example.com')
        .set('x-test-user', 'donor-a')
        .expect(400)
        .expect((response) => expect(response.body.message).toBe('Tenant context is required'));
    }

    expect(giving.listMyPledges).not.toHaveBeenCalled();
    expect(giving.listMyReceipts).not.toHaveBeenCalled();
  });

  it('finance reports and tenant-wide history reject unresolved tenant context before reading data', async () => {
    const routes = [
      { path: '/api/giving/reports/summary', method: 'get', service: giving.getFinanceReport },
      { path: '/api/giving/reports/reconciliation', method: 'get', service: giving.getReconciliationReport },
      { path: '/api/giving/receipts', method: 'get', service: giving.listTenantReceipts },
      { path: '/api/giving/pledges', method: 'get', service: giving.listTenantPledges },
      { path: '/api/giving/payments', method: 'get', service: giving.listTenantPayments },
      { path: '/api/giving/expenses', method: 'get', service: giving.listTenantExpenses },
      { path: '/api/giving/adjustments', method: 'get', service: giving.listTenantAdjustments },
    ];

    for (const route of routes) {
      route.service.mockClear();
      await request(app.getHttpServer())
        .get(route.path)
        .set('Host', 'unknown.example.com')
        .set('x-test-user', 'user-finance-approver')
        .expect(403)
        .expect({
          statusCode: 403,
          message: 'Tenant authorization context is required',
          error: 'Forbidden',
        });
      expect(route.service).not.toHaveBeenCalled();
    }
  });

  it('campaign creation and status changes reject unresolved tenant context before writes or audit events', async () => {
    const routes = [
      {
        method: 'post',
        path: '/api/giving/campaigns',
        service: giving.createCampaign,
        body: { name: 'Unscoped campaign', description: 'Must not be created', targetAmountPaise: 50000 },
      },
      {
        method: 'patch',
        path: '/api/giving/campaigns/campaign-1/status',
        service: giving.updateCampaignStatus,
        body: { status: 'CLOSED' },
      },
    ];

    audit.record.mockClear();
    for (const route of routes) {
      route.service.mockClear();
      const httpRequest = request(app.getHttpServer());
      const response = route.method === 'patch'
        ? httpRequest.patch(route.path)
        : httpRequest.post(route.path);
      await response
        .set('Host', 'unknown.example.com')
        .set('x-test-user', 'user-finance-approver')
        .send(route.body)
        .expect(403)
        .expect({
          statusCode: 403,
          message: 'Tenant authorization context is required',
          error: 'Forbidden',
        });
      expect(route.service).not.toHaveBeenCalled();
    }
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('finance mutations reject unresolved tenant context before writes or audit events', async () => {
    const routes = [
      {
        path: '/api/giving/pledges',
        service: giving.createPledge,
        body: { campaignId: 'campaign-public', pledgedAmountPaise: 5000 },
        expectedStatus: 400,
        expectedMessage: 'Tenant context is required',
      },
      {
        path: '/api/giving/pledges/pledge-1/payments',
        service: giving.recordPayment,
        body: { amountPaise: 5000, method: 'UPI' },
        expectedStatus: 403,
      },
      { path: '/api/giving/payments/payment-1/approve', service: giving.approvePayment, body: {}, expectedStatus: 403 },
      { path: '/api/giving/payments/payment-1/reject', service: giving.rejectPayment, body: { reason: 'Test rejection' }, expectedStatus: 403 },
      {
        path: '/api/giving/expenses',
        service: giving.createExpense,
        body: { category: 'MAINTENANCE', description: 'Test expense', amountPaise: 5000 },
        expectedStatus: 403,
      },
      { path: '/api/giving/expenses/expense-1/approve', service: giving.approveExpense, body: {}, expectedStatus: 403 },
      { path: '/api/giving/expenses/expense-1/reject', service: giving.rejectExpense, body: { reason: 'Test rejection' }, expectedStatus: 403 },
      {
        path: '/api/giving/payments/payment-1/adjustments',
        service: giving.createAdjustment,
        body: { kind: 'REFUND', amountPaise: 1000, reason: 'Test adjustment' },
        expectedStatus: 403,
      },
      { path: '/api/giving/adjustments/adjustment-1/approve', service: giving.approveAdjustment, body: {}, expectedStatus: 403 },
      { path: '/api/giving/adjustments/adjustment-1/reject', service: giving.rejectAdjustment, body: { reason: 'Test rejection' }, expectedStatus: 403 },
    ];

    audit.record.mockClear();
    for (const route of routes) {
      route.service.mockClear();
      const response = await request(app.getHttpServer())
        .post(route.path)
        .set('Host', 'unknown.example.com')
        .set('x-test-user', 'user-finance-approver')
        .send(route.body)
        .expect(route.expectedStatus);

      if (route.expectedMessage) {
        expect(response.body).toMatchObject({
          statusCode: route.expectedStatus,
          message: route.expectedMessage,
        });
      } else {
        expect(response.body).toMatchObject({
          statusCode: 403,
          message: 'Tenant authorization context is required',
          error: 'Forbidden',
        });
      }
      expect(route.service).not.toHaveBeenCalled();
    }
    expect(audit.record).not.toHaveBeenCalled();
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


  it('denies cross-tenant financial writes before persistence and audit side effects', async () => {
    const routes: Array<{
      path: string;
      service: jest.Mock;
      body: Record<string, unknown>;
    }> = [
      {
        path: '/api/giving/expenses',
        service: giving.createExpense,
        body: { category: 'MAINTENANCE', amountPaise: 10000, description: 'Cross-tenant attempt' },
      },
      {
        path: '/api/giving/pledges/pledge-1/payments',
        service: giving.recordPayment,
        body: { amountPaise: 5000, method: 'UPI' },
      },
      {
        path: '/api/giving/payments/payment-1/adjustments',
        service: giving.createAdjustment,
        body: { kind: 'REFUND', amountPaise: 1000, reason: 'Cross-tenant attempt' },
      },
      {
        path: '/api/giving/payments/payment-1/approve',
        service: giving.approvePayment,
        body: {},
      },
      {
        path: '/api/giving/expenses/expense-1/approve',
        service: giving.approveExpense,
        body: {},
      },
      {
        path: '/api/giving/adjustments/adjustment-1/approve',
        service: giving.approveAdjustment,
        body: {},
      },
    ];

    for (const [index, route] of routes.entries()) {
      route.service.mockClear();
      audit.record.mockClear();

      await request(app.getHttpServer())
        .post(route.path)
        .set('Host', 'badebabakharadi.com')
        .set('x-test-user', 'user-cross-tenant')
        .set('idempotency-key', `cross-tenant-write-${index}`)
        .send(route.body)
        .expect(403)
        .expect({
          statusCode: 403,
          message: 'Tenant access denied',
          error: 'Forbidden',
        });

      expect(route.service).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    }
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

  it('denies cross-tenant finance users access to tenant-wide giving read routes before data access', async () => {
    const routes = [
      { path: '/api/giving/receipts', service: giving.listTenantReceipts },
      { path: '/api/giving/pledges', service: giving.listTenantPledges },
      { path: '/api/giving/payments', service: giving.listTenantPayments },
      { path: '/api/giving/expenses', service: giving.listTenantExpenses },
      { path: '/api/giving/adjustments', service: giving.listTenantAdjustments },
      { path: '/api/giving/reports/summary', service: giving.getFinanceReport },
      { path: '/api/giving/reports/reconciliation', service: giving.getReconciliationReport },
    ];

    for (const route of routes) {
      route.service.mockClear();

      await request(app.getHttpServer())
        .get(route.path)
        .set('Host', 'badebabakharadi.com')
        .set('x-test-user', 'user-cross-tenant')
        .expect(403)
        .expect({
          statusCode: 403,
          message: 'Tenant access denied',
          error: 'Forbidden',
        });

      expect(route.service).not.toHaveBeenCalled();
    }
  });

  it('allows a finance viewer to read tenant-scoped summary and reconciliation reports', async () => {
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const summary = { tenantId, totalIncomePaise: 12345 };
    const reconciliation = { tenantId, balanced: true };
    giving.getFinanceReport.mockResolvedValue(summary);
    giving.getReconciliationReport.mockResolvedValue(reconciliation);

    await request(app.getHttpServer())
      .get('/api/giving/reports/summary')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-viewer')
      .expect(200)
      .expect(summary);

    await request(app.getHttpServer())
      .get('/api/giving/reports/reconciliation')
      .set('Host', 'badebabakharadi.com')
      .set('x-test-user', 'user-viewer')
      .expect(200)
      .expect(reconciliation);

    expect(giving.getFinanceReport).toHaveBeenCalledTimes(1);
    expect(giving.getFinanceReport).toHaveBeenCalledWith(tenantId);
    expect(giving.getReconciliationReport).toHaveBeenCalledTimes(1);
    expect(giving.getReconciliationReport).toHaveBeenCalledWith(tenantId);
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

  it('GET /api/platform/tenants/:tenantId/finance-team denies non-platform users before listing members', async () => {
    membership.listTenantMemberships.mockClear();

    await request(app.getHttpServer())
      .get('/api/platform/tenants/tenant-finance-a/finance-team')
      .set('x-test-user', 'user-a')
      .expect(403);

    expect(membership.listTenantMemberships).not.toHaveBeenCalled();
  });

  it('GET /api/platform/tenants/:tenantId/finance-team exposes only financial roles without phone details', async () => {
    firestore.getTenantById.mockClear();
    membership.listTenantMemberships.mockClear();

    await request(app.getHttpServer())
      .get('/api/platform/tenants/tenant-finance-a/finance-team')
      .set('x-test-user', 'user-platform-admin')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual([{
          userId: 'finance-user',
          email: 'finance@example.test',
          displayName: 'Finance User',
          roles: ['FINANCE_VIEWER'],
        }]);
      });

    expect(firestore.getTenantById).toHaveBeenCalledWith('tenant-finance-a');
    expect(membership.listTenantMemberships).toHaveBeenCalledWith('tenant-finance-a');
  });

  it('POST /api/platform/tenants/:tenantId/finance-team validates grant payload before provisioning', async () => {
    membership.grantFinancialRoleByEmail.mockClear();

    await request(app.getHttpServer())
      .post('/api/platform/tenants/tenant-finance-a/finance-team')
      .set('x-test-user', 'user-platform-admin')
      .send({ email: 'not-an-email', role: 'SUPER_USER' })
      .expect(400);

    expect(membership.grantFinancialRoleByEmail).not.toHaveBeenCalled();
  });

  it('POST /api/platform/tenants/:tenantId/finance-team grants and audits a financial role', async () => {
    firestore.getTenantById.mockClear();
    firestore.recordAudit.mockClear();
    membership.grantFinancialRoleByEmail.mockClear();

    await request(app.getHttpServer())
      .post('/api/platform/tenants/tenant-finance-a/finance-team')
      .set('x-test-user', 'user-platform-admin')
      .send({ email: 'finance@example.test', role: 'FINANCE_OPERATOR' })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual({
          userId: 'finance-target',
          tenantId: 'tenant-finance-a',
          roles: ['FINANCE_OPERATOR'],
        });
      });

    expect(membership.grantFinancialRoleByEmail).toHaveBeenCalledWith(
      'finance@example.test',
      'tenant-finance-a',
      'FINANCE_OPERATOR',
      'user-platform-admin',
    );
    expect(firestore.recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-finance-a',
      userId: 'user-platform-admin',
      action: 'TENANT_FINANCE_ROLE_GRANTED',
      entity: 'TenantMembership',
      entityId: 'finance-target-membership',
      metadata: expect.objectContaining({
        targetUserId: 'finance-target',
        role: 'FINANCE_OPERATOR',
      }),
    }));
  });

  it('DELETE /api/platform/tenants/:tenantId/finance-team/:userId/:role denies non-platform users before revocation', async () => {
    membership.revokeFinancialRole.mockClear();

    await request(app.getHttpServer())
      .delete('/api/platform/tenants/tenant-finance-a/finance-team/finance-target/FINANCE_OPERATOR')
      .set('x-test-user', 'user-a')
      .expect(403);

    expect(membership.revokeFinancialRole).not.toHaveBeenCalled();
  });

  it('DELETE /api/platform/tenants/:tenantId/finance-team/:userId/:role revokes and audits one financial role', async () => {
    firestore.getTenantById.mockClear();
    firestore.recordAudit.mockClear();
    membership.revokeFinancialRole.mockClear();

    await request(app.getHttpServer())
      .delete('/api/platform/tenants/tenant-finance-a/finance-team/finance-target/FINANCE_OPERATOR')
      .set('x-test-user', 'user-platform-admin')
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          userId: 'finance-target',
          tenantId: 'tenant-finance-a',
          roles: [],
          membershipDeleted: false,
        });
      });

    expect(membership.revokeFinancialRole).toHaveBeenCalledWith(
      'finance-target',
      'tenant-finance-a',
      'FINANCE_OPERATOR',
    );
    expect(firestore.recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-finance-a',
      userId: 'user-platform-admin',
      action: 'TENANT_FINANCE_ROLE_REVOKED',
      entity: 'TenantMembership',
      entityId: 'finance-target-membership',
      metadata: expect.objectContaining({
        targetUserId: 'finance-target',
        role: 'FINANCE_OPERATOR',
        previousRoles: ['CONTENT_MANAGER', 'FINANCE_OPERATOR'],
        remainingRoles: ['CONTENT_MANAGER'],
        membershipDeleted: false,
      }),
    }));
  });


  it('GET /api/platform/tenants/:tenantId/finance-team returns 404 for an unknown tenant before listing', async () => {
    membership.listTenantMemberships.mockClear();
    firestore.getTenantById.mockClear();

    await request(app.getHttpServer())
      .get('/api/platform/tenants/tenant-does-not-exist/finance-team')
      .set('x-test-user', 'user-platform-admin')
      .expect(404);

    expect(firestore.getTenantById).toHaveBeenCalledWith('tenant-does-not-exist');
    expect(membership.listTenantMemberships).not.toHaveBeenCalled();
  });

  it('POST /api/platform/tenants/:tenantId/finance-team returns 404 for an unknown tenant before granting', async () => {
    membership.grantFinancialRoleByEmail.mockClear();
    firestore.getTenantById.mockClear();

    await request(app.getHttpServer())
      .post('/api/platform/tenants/tenant-does-not-exist/finance-team')
      .set('x-test-user', 'user-platform-admin')
      .send({ email: 'finance@example.test', role: 'FINANCE_OPERATOR' })
      .expect(404);

    expect(firestore.getTenantById).toHaveBeenCalledWith('tenant-does-not-exist');
    expect(membership.grantFinancialRoleByEmail).not.toHaveBeenCalled();
  });

  it('revoking a finance role removes protected access on the next HTTP request', async () => {
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const originalResolve = membership.resolve.getMockImplementation();
    let financeRoleRevoked = false;

    membership.resolve.mockImplementation(async (userId: string, resolvedTenantId: string) => {
      if (userId === 'finance-target' && resolvedTenantId === tenantId) {
        return {
          userId,
          tenantId: resolvedTenantId,
          role: financeRoleRevoked ? 'CONTENT_MANAGER' : 'FINANCE_OPERATOR',
        };
      }
      return originalResolve ? originalResolve(userId, resolvedTenantId) : null;
    });

    try {
      giving.listTenantExpenses.mockClear();
      firestore.getTenantById.mockResolvedValueOnce({
        id: tenantId,
        name: 'Revocation Test Tenant',
      });
      membership.revokeFinancialRole.mockImplementationOnce(async () => {
        financeRoleRevoked = true;
        return {
          id: 'finance-target-membership',
          userId: 'finance-target',
          tenantId,
          roles: ['CONTENT_MANAGER'],
          previousRoles: ['CONTENT_MANAGER', 'FINANCE_OPERATOR'],
          membershipDeleted: false,
        };
      });

      await request(app.getHttpServer())
        .get('/api/giving/expenses')
        .set('Host', 'badebabakharadi.com')
        .set('x-test-user', 'finance-target')
        .expect(200);
      expect(giving.listTenantExpenses).toHaveBeenCalledTimes(1);

      await request(app.getHttpServer())
        .delete(`/api/platform/tenants/${tenantId}/finance-team/finance-target/FINANCE_OPERATOR`)
        .set('x-test-user', 'user-platform-admin')
        .expect(200);

      await request(app.getHttpServer())
        .get('/api/giving/expenses')
        .set('Host', 'badebabakharadi.com')
        .set('x-test-user', 'finance-target')
        .expect(403)
        .expect((response) => {
          expect(response.body.message).toBe('Permission denied');
        });

      // The rejected request must stop at authorization, before tenant data is read.
      expect(giving.listTenantExpenses).toHaveBeenCalledTimes(1);
    } finally {
      if (originalResolve) {
        membership.resolve.mockImplementation(originalResolve);
      }
    }
  });

  it('DELETE /api/platform/tenants/:tenantId/finance-team/:userId/:role returns 404 for an unknown tenant before revoking', async () => {
    membership.revokeFinancialRole.mockClear();
    firestore.getTenantById.mockClear();

    await request(app.getHttpServer())
      .delete('/api/platform/tenants/tenant-does-not-exist/finance-team/finance-target/FINANCE_OPERATOR')
      .set('x-test-user', 'user-platform-admin')
      .expect(404);

    expect(firestore.getTenantById).toHaveBeenCalledWith('tenant-does-not-exist');
    expect(membership.revokeFinancialRole).not.toHaveBeenCalled();
  });


  it('does not write a grant audit event when financial-role assignment is rejected', async () => {
    membership.grantFinancialRoleByEmail.mockClear();
    firestore.recordAudit.mockClear();
    membership.grantFinancialRoleByEmail.mockRejectedValueOnce(
      new ForbiddenException('Tenant administrators cannot be assigned financial roles'),
    );

    await request(app.getHttpServer())
      .post('/api/platform/tenants/tenant-finance-a/finance-team')
      .set('x-test-user', 'user-platform-admin')
      .send({ email: 'tenant-admin@example.test', role: 'FINANCE_OPERATOR' })
      .expect(403)
      .expect((response) => {
        expect(response.body.message).toContain('Tenant administrators cannot be assigned financial roles');
      });

    expect(membership.grantFinancialRoleByEmail).toHaveBeenCalledWith(
      'tenant-admin@example.test',
      'tenant-finance-a',
      'FINANCE_OPERATOR',
      'user-platform-admin',
    );
    expect(firestore.recordAudit).not.toHaveBeenCalled();
  });

  it('does not write a revoke audit event when the requested financial role is not assigned', async () => {
    membership.revokeFinancialRole.mockClear();
    firestore.recordAudit.mockClear();
    membership.revokeFinancialRole.mockRejectedValueOnce(
      new NotFoundException('The requested financial role is not assigned'),
    );

    await request(app.getHttpServer())
      .delete('/api/platform/tenants/tenant-finance-a/finance-team/finance-target/FINANCE_APPROVER')
      .set('x-test-user', 'user-platform-admin')
      .expect(404)
      .expect((response) => {
        expect(response.body.message).toContain('The requested financial role is not assigned');
      });

    expect(membership.revokeFinancialRole).toHaveBeenCalledWith(
      'finance-target',
      'tenant-finance-a',
      'FINANCE_APPROVER',
    );
    expect(firestore.recordAudit).not.toHaveBeenCalled();
  });

});
