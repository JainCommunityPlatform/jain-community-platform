import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';

describe('TenantController', () => {
  let controller: TenantController;
  const tenantService = {
    resolve: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantController],
      providers: [{ provide: TenantService, useValue: tenantService }],
    }).compile();

    controller = module.get(TenantController);
    tenantService.resolve.mockReset();
  });

  it('delegates hostname resolution to the tenant service', async () => {
    tenantService.resolve.mockResolvedValue(null);

    await expect(controller.resolve('example.com')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(tenantService.resolve).toHaveBeenCalledWith('example.com');
  });
});
