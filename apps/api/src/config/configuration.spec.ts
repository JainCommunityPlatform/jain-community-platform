import { configuration } from './configuration';

describe('configuration', () => {
  const originalPort = process.env.PORT;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalRedisUrl = process.env.REDIS_URL;
  const originalFirebaseProjectId = process.env.FIREBASE_PROJECT_ID;
  const originalAuthJwksUrl = process.env.AUTH_JWKS_URL;
  const originalAuthIssuer = process.env.AUTH_ISSUER;
  const originalAuthAudience = process.env.AUTH_AUDIENCE;

  afterEach(() => {
    process.env.PORT = originalPort;
    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.REDIS_URL = originalRedisUrl;
    process.env.FIREBASE_PROJECT_ID = originalFirebaseProjectId;
    process.env.AUTH_JWKS_URL = originalAuthJwksUrl;
    process.env.AUTH_ISSUER = originalAuthIssuer;
    process.env.AUTH_AUDIENCE = originalAuthAudience;
  });

  it('uses safe defaults when infrastructure variables are absent', () => {
    delete process.env.PORT;
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.AUTH_JWKS_URL;
    delete process.env.AUTH_ISSUER;
    delete process.env.AUTH_AUDIENCE;

    expect(configuration()).toEqual({
      port: 3000,
      database: { url: undefined },
      redis: { url: undefined },
      auth: {
        jwksUrl:
          'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com',
        issuer: 'https://securetoken.google.com/jain-community-platform',
        audience: 'jain-community-platform',
      },
    });
  });

  it('reads PostgreSQL and Redis connection settings from the environment', () => {
    process.env.PORT = '4000';
    process.env.DATABASE_URL = 'postgresql://localhost/jcp';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.FIREBASE_PROJECT_ID = 'custom-project';
    process.env.AUTH_JWKS_URL = 'https://example.test/jwks';
    process.env.AUTH_ISSUER = 'https://example.test/issuer';
    process.env.AUTH_AUDIENCE = 'custom-audience';

    expect(configuration()).toEqual({
      port: 4000,
      database: { url: 'postgresql://localhost/jcp' },
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
