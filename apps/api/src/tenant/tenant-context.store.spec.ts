import { TenantContextStore } from './tenant-context.store';

describe('TenantContextStore', () => {
  it('makes the tenant available throughout the request async context', async () => {
    const store = new TenantContextStore();
    const tenant = {
      id: 'tenant-1',
      name: 'Tenant One',
      hostname: 'tenant.example.com',
    };

    await store.run(tenant, async () => {
      await Promise.resolve();
      expect(store.get()).toEqual(tenant);
    });
  });

  it('returns null outside a tenant request context', () => {
    const store = new TenantContextStore();

    expect(store.get()).toBeNull();
  });
});
