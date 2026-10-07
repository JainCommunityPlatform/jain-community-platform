import { PlatformService } from './platform.service';

describe('PlatformService', () => {
  const firestore = {
    getTenantBySlug: jest.fn(),
    getTenantByHostname: jest.fn(),
    createTenant: jest.fn(),
    setWebsiteConfig: jest.fn(),
    assignTenantAdmin: jest.fn(),
    findUserByEmail: jest.fn(),
    createTenantAdminInvite: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const config = { get: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue('jcp.example');
    firestore.getTenantBySlug.mockResolvedValue(null);
    firestore.getTenantByHostname.mockResolvedValue(null);
    firestore.createTenant.mockImplementation(async (input: Record<string, unknown>) => input);
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
});
