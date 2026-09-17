import { ConfigService } from '@nestjs/config';

import { ConfigTenantResolver } from './config-tenant.resolver';

describe('ConfigTenantResolver', () => {
  const config = new ConfigService({
    TENANT_HOSTNAME: 'badebabakharadi.com',
    TENANT_ID: 'bade-baba-kharadi',
    TENANT_NAME: 'Bade Baba Kharadi',
  });
  const resolver = new ConfigTenantResolver(config);

  it('resolves a configured hostname case-insensitively', async () => {
    await expect(resolver.resolve('BADEBABAKHARADI.COM')).resolves.toEqual({
      id: 'bade-baba-kharadi',
      name: 'Bade Baba Kharadi',
      hostname: 'badebabakharadi.com',
    });
  });

  it('resolves the configured hostname with a www prefix', async () => {
    await expect(resolver.resolve('WWW.BADEBABAKHARADI.COM')).resolves.toEqual({
      id: 'bade-baba-kharadi',
      name: 'Bade Baba Kharadi',
      hostname: 'badebabakharadi.com',
    });
  });

  it('does not invent a tenant for an unknown hostname', async () => {
    await expect(resolver.resolve('example.com')).resolves.toBeNull();
  });
});
