import { NotFoundException } from '@nestjs/common';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { TenantContextStore } from './tenant-context.store';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';

describe('TenantController', () => {
  const tenantService = {
    resolve: jest.fn(),
  };
  const tenantContextStore = {
    get: jest.fn(),
  };

  const controller = new TenantController(
    tenantService as unknown as TenantService,
    tenantContextStore as unknown as TenantContextStore,
  );

  beforeEach(() => {
    tenantService.resolve.mockReset();
    tenantContextStore.get.mockReset();
  });

  it('delegates hostname resolution to the tenant service', async () => {
    tenantService.resolve.mockResolvedValue(null);

    await expect(controller.resolve('example.com')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tenantService.resolve).toHaveBeenCalledWith('example.com');
  });

  it('returns a resolved tenant when the hostname is known', async () => {
    const tenant = {
      id: 'tenant-1',
      name: 'Tenant One',
      hostname: 'tenant.example.com',
    };
    tenantService.resolve.mockResolvedValue(tenant);

    await expect(controller.resolve('tenant.example.com')).resolves.toBe(tenant);
  });

  it('uses an empty hostname when none is supplied', async () => {
    tenantService.resolve.mockResolvedValue(null);

    await expect(controller.resolve()).rejects.toThrow(
      new NotFoundException('Tenant not found'),
    );
    expect(tenantService.resolve).toHaveBeenCalledWith('');
  });

  it('returns the tenant from the current request context', () => {
    const tenant = {
      id: 'tenant-1',
      name: 'Tenant One',
      hostname: 'tenant.example.com',
    };
    tenantContextStore.get.mockReturnValue(tenant);

    expect(controller.getContext()).toEqual(tenant);
  });

  it('rejects when the current request has no tenant context', () => {
    tenantContextStore.get.mockReturnValue(null);

    expect(() => controller.getContext()).toThrow(NotFoundException);
  });
});
