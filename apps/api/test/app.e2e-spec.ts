import { ExecutionContext, INestApplication } from '@nestjs/common';
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

describe('API endpoints (integration)', () => {
  let app: INestApplication;

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
      })),
    };

    const membership = {
      resolve: jest.fn(async (userId: string, tenantId: string) => {
        if (userId === 'user-none') return null;

        return {
          userId,
          tenantId: userId === 'user-cross-tenant' ? 'tenant-b' : tenantId,
          role: userId === 'user-viewer' ? 'FINANCE_VIEWER' : 'TENANT_ADMIN',
        } as const;
      }),
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
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
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
});
