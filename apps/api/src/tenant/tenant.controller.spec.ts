import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { TenantContextStore } from './tenant-context.store';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';

describe('TenantController', () => {
  let controller: TenantController;
  const tenantService = {
    resolve: jest.fn(),
  };
  const tenantContextStore = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantController],
      providers: [
        { provide: TenantService, useValue: tenantService },
        { provide: TenantContextStore, useValue: tenantContextStore },
      ],
    }).compile();

    controller = module.get(TenantController);
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
