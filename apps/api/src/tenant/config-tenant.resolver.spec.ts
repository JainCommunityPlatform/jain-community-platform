import { ConfigService } from '@nestjs/config';

import { ConfigTenantResolver } from './config-tenant.resolver';

describe('ConfigTenantResolver', () => {
  it('resolves a configured hostname', async () => {
    const config = new ConfigService({
      TENANT_HOSTNAME: 'badebabakharadi.com',
      TENANT_ID: 'bade-baba-kharadi',
      TENANT_NAME: 'Bade Baba Kharadi',
    });

    const resolver = new ConfigTenantResolver(config);

    await expect(resolver.resolve('WWW.BADEBABAKHARADI.COM')).resolves.toEqual({
      id: 'bade-baba-kharadi',
      name: 'Bade Baba Kharadi',
      hostname: 'badebabakharadi.com',
    });
  });

  it('does not invent a tenant for an unknown hostname', async () => {
    const config = new ConfigService({
      TENANT_HOSTNAME: 'badebabakharadi.com',
      TENANT_ID: 'bade-baba-kharadi',
      TENANT_NAME: 'Bade Baba Kharadi',
    });

    const resolver = new ConfigTenantResolver(config);

    await expect(resolver.resolve('example.com')).resolves.toBeNull();
  });
});
