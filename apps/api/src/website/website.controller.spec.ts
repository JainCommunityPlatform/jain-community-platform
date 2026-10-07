jest.mock('../auth/authentication.guard', () => ({ AuthenticationGuard: class {} }));
jest.mock('../authorization/authorization.guard', () => ({ AuthorizationGuard: class {} }));

import { WebsiteController } from './website.controller';

describe('WebsiteController', () => {
  const website = {
    getCurrent: jest.fn().mockResolvedValue({ tenantId: 't1' }),
    updateCurrent: jest.fn().mockResolvedValue({ tenantId: 't1', version: 2 }),
    resetCurrent: jest.fn().mockResolvedValue({ tenantId: 't1', version: 1 }),
  };
  const storage = {
    uploadTenantImage: jest.fn().mockResolvedValue({
      path: 'tenants/t1/website/a.jpg',
      url: 'https://example.test/a.jpg',
      contentType: 'image/jpeg',
      size: 10,
    }),
  };
  const audit = { record: jest.fn() };
  const tenantContext = { get: jest.fn().mockReturnValue({ id: 't1' }) };

  beforeEach(() => jest.clearAllMocks());

  it('serves and updates the current tenant site', async () => {
    const controller = new WebsiteController(website as never, storage as never, audit as never, tenantContext as never);

    await expect(controller.getSite()).resolves.toEqual({ tenantId: 't1' });
    await expect(controller.updateSite({ hero: { title: 'Temple' } })).resolves.toMatchObject({ version: 2 });
    await expect(controller.resetSite()).resolves.toMatchObject({ version: 1 });
  });

  it('uploads a tenant-scoped image and audits it', async () => {
    const controller = new WebsiteController(website as never, storage as never, audit as never, tenantContext as never);

    const result = await controller.upload({
      buffer: Buffer.from('image'),
      originalname: 'hero.jpg',
      mimetype: 'image/jpeg',
      size: 5,
    });

    expect(storage.uploadTenantImage).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 't1',
      filename: 'hero.jpg',
      contentType: 'image/jpeg',
    }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'WEBSITE_MEDIA_UPLOADED',
      entityId: 'tenants/t1/website/a.jpg',
    }));
    expect(result.url).toContain('a.jpg');
  });

  it('rejects media without tenant or file context', async () => {
    tenantContext.get.mockReturnValue(null);
    const controller = new WebsiteController(website as never, storage as never, audit as never, tenantContext as never);

    await expect(controller.upload(undefined)).rejects.toThrow('Tenant context is required');
  });
});
