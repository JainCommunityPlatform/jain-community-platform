import { configuration } from './configuration';

describe('configuration', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses safe Firebase defaults when infrastructure variables are absent', () => {
    delete process.env.PORT;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_BOOTSTRAP_ENABLED;
    delete process.env.FIREBASE_BOOTSTRAP_TENANT_ID;
    delete process.env.FIREBASE_BOOTSTRAP_TENANT_SLUG;
    delete process.env.FIREBASE_BOOTSTRAP_TENANT_NAME;
    delete process.env.FIREBASE_BOOTSTRAP_TENANT_HOSTNAME;
    delete process.env.FIREBASE_BOOTSTRAP_ADMIN_SUBJECT;
    delete process.env.FIREBASE_BOOTSTRAP_ADMIN_EMAIL;
    delete process.env.FIREBASE_BOOTSTRAP_ADMIN_NAME;
    delete process.env.REDIS_URL;
    delete process.env.AUTH_JWKS_URL;
    delete process.env.AUTH_ISSUER;
    delete process.env.AUTH_AUDIENCE;

    expect(configuration()).toEqual({
      port: 3000,
      firebase: {
        projectId: 'jain-community-platform',
        bootstrapEnabled: false,
        bootstrapTenantId: undefined,
        bootstrapTenantSlug: undefined,
        bootstrapTenantName: undefined,
        bootstrapTenantHostname: undefined,
        bootstrapAdminSubject: undefined,
        bootstrapAdminEmail: undefined,
        bootstrapAdminName: undefined,
      },
      redis: { url: undefined },
      auth: {
        jwksUrl:
          'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
        issuer: 'https://securetoken.google.com/jain-community-platform',
        audience: 'jain-community-platform',
      },
    });
  });

  it('reads Firebase and Redis settings from the environment', () => {
    process.env.PORT = '4000';
    process.env.FIREBASE_PROJECT_ID = 'custom-project';
    process.env.FIREBASE_BOOTSTRAP_ENABLED = 'true';
    process.env.FIREBASE_BOOTSTRAP_TENANT_ID = 'tenant-1';
    process.env.FIREBASE_BOOTSTRAP_TENANT_SLUG = 'tenant-one';
    process.env.FIREBASE_BOOTSTRAP_TENANT_NAME = 'Tenant One';
    process.env.FIREBASE_BOOTSTRAP_TENANT_HOSTNAME = 'tenant.example.com';
    process.env.FIREBASE_BOOTSTRAP_ADMIN_SUBJECT = 'firebase-user-1';
    process.env.FIREBASE_BOOTSTRAP_ADMIN_EMAIL = 'admin@example.com';
    process.env.FIREBASE_BOOTSTRAP_ADMIN_NAME = 'Admin';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.AUTH_JWKS_URL = 'https://example.test/jwks';
    process.env.AUTH_ISSUER = 'https://example.test/issuer';
    process.env.AUTH_AUDIENCE = 'custom-audience';

    expect(configuration()).toEqual({
      port: 4000,
      firebase: {
        projectId: 'custom-project',
        bootstrapEnabled: true,
        bootstrapTenantId: 'tenant-1',
        bootstrapTenantSlug: 'tenant-one',
        bootstrapTenantName: 'Tenant One',
        bootstrapTenantHostname: 'tenant.example.com',
        bootstrapAdminSubject: 'firebase-user-1',
        bootstrapAdminEmail: 'admin@example.com',
        bootstrapAdminName: 'Admin',
      },
      redis: { url: 'redis://localhost:6379' },
      auth: {
        jwksUrl: 'https://example.test/jwks',
        issuer: 'https://example.test/issuer',
        audience: 'custom-audience',
      },
    });
  });

  it('rejects an invalid port', () => {
    process.env.PORT = 'not-a-port';
    expect(() => configuration()).toThrow('PORT must be an integer');
  });
});
