import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

import { TenantContextStore } from './tenant-context.store';
import { TenantService } from './tenant.service';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantService: TenantService,
    private readonly tenantContextStore: TenantContextStore,
  ) {}

  async use(
    request: Request,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    const tenant = await this.tenantService.resolve(request.hostname);

    this.tenantContextStore.run(tenant, () => next());
  }
}
