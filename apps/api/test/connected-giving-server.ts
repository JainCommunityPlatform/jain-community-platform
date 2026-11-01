import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { deleteApp, getApps } from 'firebase-admin/app';
import { writeFileSync } from 'node:fs';
import request from 'supertest';

import { AppModule } from '../src/app.module';
import { AuthenticationGuard } from '../src/auth/authentication.guard';
import { AuthenticatedRequest } from '../src/auth/authenticated-request';
import { AuthenticatedUser } from '../src/auth/auth.types';
import { MembershipService } from '../src/authorization/membership.service';
import { UserIdentityService } from '../src/identity/user-identity.service';
import { FirestoreTenantResolver } from '../src/tenant/firestore-tenant.resolver';

async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error('FIRESTORE_EMULATOR_HOST must point to the Firestore emulator');
  }
  process.env.NODE_ENV = 'test';
  process.env.FIREBASE_PROJECT_ID = 'demo-jcp';
  process.env.FIRESTORE_DATABASE_ID = '(default)';

  const suffix = `connected-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const tenantId = `connected-giving-${suffix}`;
  const donorSubject = 'connected-donor';
  const operatorSubject = `operator-${suffix}`;
  const approverSubject = `approver-${suffix}`;
  const contentManagerSubject = `content-manager-${suffix}`;
  let operatorId = '';
  let approverId = '';
  let contentManagerId = '';

  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
    .overrideGuard(AuthenticationGuard)
    .useValue({
      canActivate: (context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
        const subject = req.header('x-test-user') ?? token;
        if (!subject) return false;
        req.user = { subject, email: `${subject}@example.test` };
        return true;
      },
    })
    .overrideProvider(FirestoreTenantResolver)
    .useValue({ resolve: async (hostname: string) => ({ id: tenantId, name: 'Connected giving test tenant', hostname }) })
    .overrideProvider(MembershipService)
    .useValue({
      resolve: async (userId: string, requestedTenantId: string) => {
        if (requestedTenantId !== tenantId) return null;
        if (userId === operatorId) return { userId, tenantId, role: 'FINANCE_OPERATOR', roles: ['FINANCE_OPERATOR'] };
        if (userId === approverId) return { userId, tenantId, role: 'FINANCE_APPROVER', roles: ['FINANCE_APPROVER'] };
        if (userId === contentManagerId) return { userId, tenantId, role: 'CONTENT_MANAGER', roles: ['CONTENT_MANAGER'] };
        return null;
      },
    })
    .compile();

  const app: INestApplication = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.init();

  try {
    const identity = app.get(UserIdentityService);
    const operator = await identity.resolve({ subject: operatorSubject, email: `${operatorSubject}@example.test` } as AuthenticatedUser);
    const approver = await identity.resolve({ subject: approverSubject, email: `${approverSubject}@example.test` } as AuthenticatedUser);
    const contentManager = await identity.resolve({ subject: contentManagerSubject, email: `${contentManagerSubject}@example.test` } as AuthenticatedUser);
    await identity.resolve({ subject: donorSubject, email: `${donorSubject}@example.test` } as AuthenticatedUser);
    operatorId = operator.id;
    approverId = approver.id;
    contentManagerId = contentManager.id;

    const host = 'connected-giving.jcp.test';
    const campaign = await request(app.getHttpServer()).post('/api/giving/campaigns')
      .set('Host', host).set('x-test-user', operatorSubject)
      .send({ name: 'Connected API receipt journey', description: 'Persisted Firestore emulator fixture', targetAmountPaise: 50000 }).expect(201);
    await request(app.getHttpServer()).patch(`/api/giving/campaigns/${campaign.body.id}/status`)
      .set('Host', host).set('x-test-user', operatorSubject).send({ status: 'ACTIVE' }).expect(200);
    const pledge = await request(app.getHttpServer()).post('/api/giving/pledges')
      .set('Host', host).set('x-test-user', donorSubject).set('idempotency-key', `pledge-${suffix}`)
      .send({ campaignId: campaign.body.id, pledgedAmountPaise: 25000 }).expect(201);
    const payment = await request(app.getHttpServer()).post(`/api/giving/pledges/${pledge.body.id}/payments`)
      .set('Host', host).set('x-test-user', operatorSubject).set('idempotency-key', `payment-${suffix}`)
      .send({ amountPaise: 25000, method: 'UPI', reference: `connected-${suffix}` }).expect(201);
    await request(app.getHttpServer()).post(`/api/giving/payments/${payment.body.id}/approve`)
      .set('Host', host).set('x-test-user', approverSubject).expect(201);

    const port = Number(process.env.JCP_CONNECTED_TEST_PORT ?? 4317);
    await app.listen(port, '0.0.0.0');
    const metadataPath = process.env.JCP_CONNECTED_METADATA_FILE ?? '/tmp/jcp-connected-metadata.json';
    writeFileSync(metadataPath, JSON.stringify({ donorSubject, operatorSubject, approverSubject, contentManagerSubject, tenantId }), { mode: 0o600 });
    process.stdout.write(JSON.stringify({ ready: true, port }) + '\n');

    const shutdown = async () => {
      await app.close();
      const firebaseApp = getApps().find((candidate) => candidate.name === '[DEFAULT]');
      if (firebaseApp) await deleteApp(firebaseApp);
      process.exit(0);
    };
    process.once('SIGTERM', () => { void shutdown(); });
    process.once('SIGINT', () => { void shutdown(); });
  } catch (error) {
    await app.close();
    const firebaseApp = getApps().find((candidate) => candidate.name === '[DEFAULT]');
    if (firebaseApp) await deleteApp(firebaseApp);
    throw error;
  }
}

void main().catch((error) => {
  process.stderr.write(String(error instanceof Error ? error.stack : error) + '\n');
  process.exitCode = 1;
});
