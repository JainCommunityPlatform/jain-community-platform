import { configuration } from './configuration';

describe('configuration', () => {
  const originalPort = process.env.PORT;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalRedisUrl = process.env.REDIS_URL;

  afterEach(() => {
    process.env.PORT = originalPort;
    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.REDIS_URL = originalRedisUrl;
  });

  it('uses safe defaults when infrastructure variables are absent', () => {
    delete process.env.PORT;
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;

    expect(configuration()).toEqual({
      port: 3000,
      database: { url: undefined },
      redis: { url: undefined },
    });
  });

  it('reads PostgreSQL and Redis connection settings from the environment', () => {
    process.env.PORT = '4000';
    process.env.DATABASE_URL = 'postgresql://localhost/jcp';
    process.env.REDIS_URL = 'redis://localhost:6379';

    expect(configuration()).toEqual({
      port: 4000,
      database: { url: 'postgresql://localhost/jcp' },
      redis: { url: 'redis://localhost:6379' },
    });
  });

  it('rejects an invalid port', () => {
    process.env.PORT = 'not-a-port';
    expect(() => configuration()).toThrow('PORT must be an integer');
  });
});
