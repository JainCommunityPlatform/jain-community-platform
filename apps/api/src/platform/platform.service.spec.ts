jest.mock('node:dns/promises', () => ({ resolveTxt: jest.fn() }));

import { resolveTxt } from 'node:dns/promises';
import { PlatformService } from './platform.service';

describe('PlatformService', () => {
  const firestore: Record<string, jest.Mock> = {
    getTenantBySlug: jest.fn(),
    getTenantByHostname: jest.fn(),
    createTenant: jest.fn(),
    setWebsiteConfig: jest.fn(),
    assignTenantAdmin: jest.fn(),
    findUserByEmail: jest.fn(),
    createTenantAdminInvite: jest.fn(),
    getTenantPrimaryDomainDetails: jest.fn(),
    markTenantPrimaryDomainVerified: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const config = { get: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue('jcp.example');
    firestore.getTenantBySlug.mockResolvedValue(null);
    firestore.getTenantByHostname.mockResolvedValue(null);
    firestore.createTenant.mockImplementation(async (input: Record<string, unknown>) => input);
    firestore.getTenantPrimaryDomainDetails.mockResolvedValue(null);
  });

  it('creates a reusable tenant with a platform subdomain and default website configuration', async () => {
    const service = new PlatformService(firestore as never, audit as never, config as never);

    const result = await service.createTenant({
      name: 'Temple One',
      slug: 'temple-one',
      adminEmail: 'admin@example.com',
      city: 'Pune',
    }, 'platform-user');

    expect(result.hostname).toBe('temple-one.jcp.example');
    expect(result.websiteReady).toBe(true);
    expect(firestore.createTenant).toHaveBeenCalledWith(expect.objectContaining({
      slug: 'temple-one',
      city: 'Pune',
      hostname: 'temple-one.jcp.example',
    }));
    expect(firestore.createTenantAdminInvite).toHaveBeenCalledWith({
      tenantId: expect.any(String),
      email: 'admin@example.com',
    });
  });

  it('assigns an existing global user as tenant admin', async () => {
    firestore.findUserByEmail.mockResolvedValue({ id: 'user-1' });
    const service = new PlatformService(firestore as never, audit as never, config as never);

    const result = await service.createTenant({
      name: 'Temple Two',
      slug: 'temple-two',
      adminEmail: 'admin@example.com',
    }, 'platform-user');

    expect(result.adminStatus).toBe('assigned');
    expect(firestore.assignTenantAdmin).toHaveBeenCalledWith('user-1', expect.any(String));
    expect(firestore.createTenantAdminInvite).not.toHaveBeenCalled();
  });

  it('reports a missing DNS TXT record without enabling the domain', async () => {
    (resolveTxt as jest.Mock).mockRejectedValue(new Error('NXDOMAIN'));
    firestore.getTenantPrimaryDomainDetails.mockResolvedValue({
      hostname: 'temple.example.com',
      type: 'CUSTOM',
      verified: false,
      verificationToken: 'token',
    });
    const service = new PlatformService(firestore as never, audit as never, config as never);

    await expect(service.verifyCustomDomain('t1')).resolves.toMatchObject({
      verified: false,
      hostname: 'temple.example.com',
    });
  });

  it('rejects duplicate tenant slugs and hostnames', async () => {
    firestore.getTenantBySlug.mockResolvedValueOnce({ id: 'existing', name: 'Existing', slug: 'temple-one' });
    const service = new PlatformService(firestore as never, audit as never, config as never);

    await expect(service.createTenant({ name: 'Temple', slug: 'temple-one' }, 'platform-user'))
      .rejects.toThrow('Tenant slug is already in use');

    firestore.getTenantBySlug.mockResolvedValue(null);
    firestore.getTenantByHostname.mockResolvedValue({ id: 'existing' });
    await expect(service.createTenant({ name: 'Temple', slug: 'temple-two' }, 'platform-user'))
      .rejects.toThrow('Tenant hostname is already in use');
  });

  it('assigns an admin by explicit user id', async () => {
    const service = new PlatformService(firestore as never, audit as never, config as never);
    const result = await service.createTenant({
      name: 'Temple Three',
      slug: 'temple-three',
      adminUserId: 'user-3',
    }, 'platform-user');

    expect(result.adminStatus).toBe('assigned');
    expect(firestore.assignTenantAdmin).toHaveBeenCalledWith('user-3', expect.any(String));
  });

  it('supports an already verified custom domain and rejects a non-custom primary domain', async () => {
    const service = new PlatformService(firestore as never, audit as never, config as never);
    firestore.getTenantPrimaryDomainDetails.mockResolvedValueOnce({
      hostname: 'temple.example.com',
      type: 'CUSTOM',
      verified: true,
    });
    await expect(service.verifyCustomDomain('t1')).resolves.toEqual({
      verified: true,
      hostname: 'temple.example.com',
    });

    firestore.getTenantPrimaryDomainDetails.mockResolvedValueOnce({
      hostname: 'temple.jcp.example',
      type: 'PLATFORM_SUBDOMAIN',
      verified: true,
    });
    await expect(service.verifyCustomDomain('t1')).rejects.toThrow('not a custom domain');
  });

  it('reports missing primary domain and a mismatched DNS token', async () => {
    const service = new PlatformService(firestore as never, audit as never, config as never);
    firestore.getTenantPrimaryDomainDetails.mockResolvedValueOnce(null);
    await expect(service.verifyCustomDomain('t1')).rejects.toThrow('Primary tenant domain not found');

    firestore.getTenantPrimaryDomainDetails.mockResolvedValueOnce({
      hostname: 'temple.example.com',
      type: 'CUSTOM',
      verified: false,
      verificationToken: 'expected',
    });
    (resolveTxt as jest.Mock).mockResolvedValueOnce([['different']]);
    await expect(service.verifyCustomDomain('t1')).resolves.toMatchObject({
      verified: false,
      message: expect.stringContaining('does not match'),
    });
  });

  it('rejects missing tenant subdomain configuration', async () => {
    config.get.mockReturnValue(undefined);
    const service = new PlatformService(firestore as never, audit as never, config as never);
    await expect(service.createTenant({ name: 'Temple Four', slug: 'temple-four' }, 'platform-user'))
      .rejects.toThrow('JCP_TENANT_BASE_DOMAIN');
  });

  it('verifies a matching DNS TXT token', async () => {
    (resolveTxt as jest.Mock).mockResolvedValue([['token']]);
    firestore.getTenantPrimaryDomainDetails.mockResolvedValue({
      hostname: 'temple.example.com',
      type: 'CUSTOM',
      verified: false,
      verificationToken: 'token',
    });
    const service = new PlatformService(firestore as never, audit as never, config as never);

    await expect(service.verifyCustomDomain('t1')).resolves.toEqual({
      verified: true,
      hostname: 'temple.example.com',
    });
    expect(firestore.markTenantPrimaryDomainVerified).toHaveBeenCalledWith('t1');
  });
});
