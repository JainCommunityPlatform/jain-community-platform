import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

describe('API endpoints (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

  it('GET /api/auth/me rejects requests without authentication', async () => {
    await request(app.getHttpServer())
      .get('/api/auth/me')
      .expect(401)
      .expect({
        statusCode: 401,
        message: 'Bearer authentication is required',
        error: 'Unauthorized',
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

  it('GET /api/tenant/context returns the tenant resolved from the request host', async () => {
    await request(app.getHttpServer())
      .get('/api/tenant/context')
      .set('Host', 'WWW.BADEBABAKHARADI.COM')
      .expect(200)
      .expect({
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Bade Baba Kharadi',
        hostname: 'badebabakharadi.com',
      });
  });

  it('GET /api/tenant/context returns 404 when the request host has no tenant', async () => {
    await request(app.getHttpServer())
      .get('/api/tenant/context')
      .set('Host', 'example.com')
      .expect(404)
      .expect({
        statusCode: 404,
        message: 'Tenant context not found',
        error: 'Not Found',
      });
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
