import { WebsiteService } from './website.service';
import { defaultWebsiteConfig } from './website.types';

describe('WebsiteService', () => {
  const firestore = {
    getWebsiteConfig: jest.fn(),
    setWebsiteConfig: jest.fn(),
  };
  const tenantContext = { get: jest.fn() };
  const audit = { record: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    tenantContext.get.mockReturnValue({
      id: 'tenant-1',
      name: 'Temple One',
      hostname: 'temple.example.com',
    });
  });

  it('returns the tenant-scoped default configuration when no site exists', async () => {
    firestore.getWebsiteConfig.mockResolvedValue(null);
    const service = new WebsiteService(firestore as never, tenantContext as never, audit as never);

    await expect(service.getCurrent()).resolves.toMatchObject({
      tenantId: 'tenant-1',
      hero: { title: 'Temple One' },
    });
    expect(firestore.getWebsiteConfig).toHaveBeenCalledWith('tenant-1');
  });

  it('updates only the resolved tenant configuration and audits the change', async () => {
    firestore.getWebsiteConfig.mockResolvedValue(defaultWebsiteConfig('tenant-1', 'Temple One'));
    const service = new WebsiteService(firestore as never, tenantContext as never, audit as never);

    const result = await service.updateCurrent({
      hero: { title: 'Updated Temple' },
      _versionNote: 'homepage copy',
    });

    expect(result.hero.title).toBe('Updated Temple');
    expect(firestore.setWebsiteConfig).toHaveBeenCalledWith('tenant-1', result);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'WEBSITE_CONFIG_UPDATED',
      entityId: 'tenant-1',
    }));
  });

  it('rejects updates without tenant context', async () => {
    tenantContext.get.mockReturnValue(null);
    const service = new WebsiteService(firestore as never, tenantContext as never, audit as never);

    await expect(service.getCurrent()).rejects.toThrow('Tenant context not found');
  });
});
