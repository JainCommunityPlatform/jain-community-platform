import { FirestoreTenantResolver } from './firestore-tenant.resolver';

describe('FirestoreTenantResolver', () => {
  const getTenantByHostname = jest.fn();
  const firestore = { getTenantByHostname };
  const resolver = new FirestoreTenantResolver(firestore as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves a tenant by normalized hostname', async () => {
    getTenantByHostname.mockResolvedValue({
      id: 'tenant-1',
      name: 'Bade Baba Kharadi',
      hostname: 'badebabakharadi.com',
      status: 'ACTIVE',
      verified: true,
    });

    await expect(resolver.resolve('WWW.BADEBABAKHARADI.COM')).resolves.toEqual({
      id: 'tenant-1',
      name: 'Bade Baba Kharadi',
      hostname: 'badebabakharadi.com',
      status: 'ACTIVE',
      verified: true,
    });

    expect(getTenantByHostname).toHaveBeenCalledWith('badebabakharadi.com');
  });

  it('normalizes whitespace around a hostname', async () => {
    getTenantByHostname.mockResolvedValue({
      id: 'tenant-1',
      name: 'Bade Baba Kharadi',
      hostname: 'badebabakharadi.com',
    });

    await expect(resolver.resolve('  badebabakharadi.com  ')).resolves.toEqual({
      id: 'tenant-1',
      name: 'Bade Baba Kharadi',
      hostname: 'badebabakharadi.com',
    });
  });

  it('returns null for an unknown hostname', async () => {
    getTenantByHostname.mockResolvedValue(null);

    await expect(resolver.resolve('example.com')).resolves.toBeNull();
  });
});
