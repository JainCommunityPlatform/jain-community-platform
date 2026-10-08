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

  it('rejects an unverified or inactive hostname', async () => {
    getTenantByHostname.mockResolvedValueOnce({
      id: 'tenant-1',
      name: 'Bade Baba Kharadi',
      hostname: 'badebabakharadi.com',
      status: 'ACTIVE',
      verified: false,
    });
    await expect(resolver.resolve('badebabakharadi.com')).resolves.toBeNull();

    getTenantByHostname.mockResolvedValueOnce({
      id: 'tenant-1',
      name: 'Bade Baba Kharadi',
      hostname: 'badebabakharadi.com',
      status: 'INACTIVE',
      verified: true,
    });
    await expect(resolver.resolve('badebabakharadi.com')).resolves.toBeNull();
  });

  it('resolves an active tenant by explicit mobile tenant id', async () => {
    getTenantByHostname.mockResolvedValue(null);
    const getTenantById = jest.fn().mockResolvedValue({
      id: 'tenant-1',
      name: 'Bade Baba Kharadi',
      hostname: 'badebabakharadi.jcp.example',
      status: 'ACTIVE',
    });
    const mobileResolver = new FirestoreTenantResolver({ getTenantByHostname, getTenantById } as never);

    await expect(mobileResolver.resolve('api.jcp.example', 'tenant-1')).resolves.toEqual({
      id: 'tenant-1',
      name: 'Bade Baba Kharadi',
      hostname: 'badebabakharadi.jcp.example',
    });
    expect(getTenantById).toHaveBeenCalledWith('tenant-1');
  });

  it('returns null for an unknown hostname and unknown tenant id', async () => {
    getTenantByHostname.mockResolvedValue(null);
    const getTenantById = jest.fn().mockResolvedValue(null);
    const mobileResolver = new FirestoreTenantResolver({ getTenantByHostname, getTenantById } as never);

    await expect(mobileResolver.resolve('example.com')).resolves.toBeNull();
    await expect(mobileResolver.resolve('example.com', 'missing')).resolves.toBeNull();
  });
});
