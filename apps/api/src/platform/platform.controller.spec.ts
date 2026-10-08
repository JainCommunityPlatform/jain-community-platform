jest.mock('../auth/authentication.guard', () => ({ AuthenticationGuard: class {} }));
jest.mock('../authorization/authorization.guard', () => ({ AuthorizationGuard: class {} }));

import { PlatformController } from './platform.controller';

describe('PlatformController', () => {
  const platform = {
    listTenants: jest.fn().mockResolvedValue([]),
    createTenant: jest.fn().mockResolvedValue({ id: 't1' }),
    verifyCustomDomain: jest.fn().mockResolvedValue({ verified: true }),
    getTenant: jest.fn().mockResolvedValue({ id: 't1', admins: [] }),
    updateTenant: jest.fn().mockResolvedValue({ id: 't1' }),
    addTenantAdmin: jest.fn().mockResolvedValue({ status: 'assigned' }),
  };
  const auth = {
    get: jest.fn().mockReturnValue({ subject: 'sub-1', email: 'admin@example.com' }),
  };
  const identity = {
    resolve: jest.fn().mockResolvedValue({ id: 'user-1', platformRoles: ['PLATFORM_ADMIN'] }),
  };

  beforeEach(() => jest.clearAllMocks());

  it('lists tenants for a platform administrator', async () => {
    const controller = new PlatformController(platform as never, auth as never, identity as never);
    await expect(controller.listTenants()).resolves.toEqual([]);
  });

  it('creates a tenant using the authenticated platform identity', async () => {
    const controller = new PlatformController(platform as never, auth as never, identity as never);
    await controller.createTenant({ name: 'Temple', slug: 'temple' });
    expect(platform.createTenant).toHaveBeenCalledWith(
      { name: 'Temple', slug: 'temple' },
      'user-1',
    );
  });

  it('updates a tenant using the authenticated platform identity', async () => {
    const controller = new PlatformController(platform as never, auth as never, identity as never);
    await controller.updateTenant('t1', { name: 'Updated' });
    expect(platform.updateTenant).toHaveBeenCalledWith({ name: 'Updated' }, 'user-1');
  });

  it('lists and adds tenant administrators', async () => {
    const controller = new PlatformController(platform as never, auth as never, identity as never);
    await expect(controller.listTenantAdmins('t1')).resolves.toEqual([]);
    await controller.addTenantAdmin('t1', { email: 'admin@example.com' });
    expect(platform.addTenantAdmin).toHaveBeenCalledWith('t1', { email: 'admin@example.com' }, 'user-1');
  });

  it('verifies a tenant custom domain', async () => {
    const controller = new PlatformController(platform as never, auth as never, identity as never);
    await expect(controller.verifyDomain('t1')).resolves.toEqual({ verified: true });
    expect(platform.verifyCustomDomain).toHaveBeenCalledWith('t1');
  });
});
