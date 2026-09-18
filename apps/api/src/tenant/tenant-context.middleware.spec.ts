import { TenantService } from './tenant.service';
import { TenantContextMiddleware } from './tenant-context.middleware';

describe('TenantContextMiddleware', () => {
  it('resolves the request hostname and runs the handler inside tenant context', async () => {
    const tenant = {
      id: 'tenant-1',
      name: 'Tenant One',
      hostname: 'tenant.example.com',
    };
    const tenantService = {
      resolve: jest.fn().mockResolvedValue(tenant),
    };
    const tenantContextStore = {
      run: jest.fn((context, callback) => callback()),
    };
    const middleware = new TenantContextMiddleware(
      tenantService as unknown as TenantService,
      tenantContextStore,
    );
    const next = jest.fn();

    await middleware.use(
      { hostname: 'TENANT.EXAMPLE.COM' } as never,
      {} as never,
      next,
    );

    expect(tenantService.resolve).toHaveBeenCalledWith('TENANT.EXAMPLE.COM');
    expect(tenantContextStore.run).toHaveBeenCalledWith(tenant, expect.any(Function));
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('preserves an empty context for an unknown hostname', async () => {
    const tenantService = {
      resolve: jest.fn().mockResolvedValue(null),
    };
    const tenantContextStore = {
      run: jest.fn((context, callback) => callback()),
    };
    const middleware = new TenantContextMiddleware(
      tenantService as unknown as TenantService,
      tenantContextStore,
    );

    await middleware.use(
      { hostname: 'example.com' } as never,
      {} as never,
      jest.fn(),
    );

    expect(tenantContextStore.run).toHaveBeenCalledWith(
      null,
      expect.any(Function),
    );
  });
});
