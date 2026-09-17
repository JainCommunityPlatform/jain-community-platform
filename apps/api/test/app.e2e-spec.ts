import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

describe('API endpoints (integration)', () => {
  let app: INestApplication;
  const originalTenantHostname = process.env.TENANT_HOSTNAME;
  const originalTenantId = process.env.TENANT_ID;
  const originalTenantName = process.env.TENANT_NAME;

  beforeAll(async () => {
    process.env.TENANT_HOSTNAME = 'badebabakharadi.com';
    process.env.TENANT_ID = 'bade-baba-kharadi';
    process.env.TENANT_NAME = 'Bade Baba Kharadi';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    process.env.TENANT_HOSTNAME = originalTenantHostname;
    process.env.TENANT_ID = originalTenantId;
    process.env.TENANT_NAME = originalTenantName;
  });

  it('GET /api/health returns 200 and a healthy status', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /api/tenant/resolve resolves the configured tenant', async () => {
    await request(app.getHttpServer())
      .get('/api/tenant/resolve')
      .query({ hostname: 'WWW.BADEBABAKHARADI.COM' })
      .expect(200)
      .expect({
        id: 'bade-baba-kharadi',
        name: 'Bade Baba Kharadi',
        hostname: 'badebabakharadi.com',
      });
  });

  it('GET /api/tenant/resolve returns null for an unknown tenant', async () => {
    await request(app.getHttpServer())
      .get('/api/tenant/resolve')
      .query({ hostname: 'example.com' })
      .expect(200)
      .expect('null');
  });
});
