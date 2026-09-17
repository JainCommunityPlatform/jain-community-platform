import { TenantService, TENANT_RESOLVER } from './tenant.service';
import { TenantContext } from './tenant.types';

describe('TenantService', () => {
  it('delegates resolution to the injected resolver', async () => {
    const tenant: TenantContext = {
      id: 'tenant-1',
      name: 'Tenant One',
      hostname: 'tenant.example.com',
    };
    const resolver = { resolve: jest.fn().mockResolvedValue(tenant) };
    const service = new TenantService(resolver);

    await expect(service.resolve('tenant.example.com')).resolves.toEqual(tenant);
    expect(resolver.resolve).toHaveBeenCalledWith('tenant.example.com');
    expect(TENANT_RESOLVER).toBeDefined();
  });
});
