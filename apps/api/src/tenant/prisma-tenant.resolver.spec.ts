import { PrismaService } from '../database/prisma.service';
import { PrismaTenantResolver } from './prisma-tenant.resolver';

describe('PrismaTenantResolver', () => {
  const prisma = {
    tenantDomain: {
      findUnique: jest.fn(),
    },
  } as unknown as PrismaService;

  const resolver = new PrismaTenantResolver(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resolves a tenant by normalized hostname', async () => {
    prisma.tenantDomain.findUnique = jest.fn().mockResolvedValue({
      hostname: 'badebabakharadi.com',
      tenant: {
        id: 'tenant-1',
        name: 'Bade Baba Kharadi',
      },
    });

    await expect(resolver.resolve('WWW.BADEBABAKHARADI.COM')).resolves.toEqual({
      id: 'tenant-1',
      name: 'Bade Baba Kharadi',
      hostname: 'badebabakharadi.com',
    });

    expect(prisma.tenantDomain.findUnique).toHaveBeenCalledWith({
      where: { hostname: 'badebabakharadi.com' },
      include: { tenant: true },
    });
  });

  it('normalizes whitespace around a hostname', async () => {
    prisma.tenantDomain.findUnique = jest.fn().mockResolvedValue({
      hostname: 'badebabakharadi.com',
      tenant: { id: 'tenant-1', name: 'Bade Baba Kharadi' },
    });

    await expect(resolver.resolve('  badebabakharadi.com  ')).resolves.toEqual({
      id: 'tenant-1',
      name: 'Bade Baba Kharadi',
      hostname: 'badebabakharadi.com',
    });
  });

  it('returns null for an unknown hostname', async () => {
    prisma.tenantDomain.findUnique = jest.fn().mockResolvedValue(null);

    await expect(resolver.resolve('example.com')).resolves.toBeNull();
  });
});
