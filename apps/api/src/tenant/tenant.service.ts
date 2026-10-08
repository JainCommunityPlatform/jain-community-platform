import { Inject, Injectable } from '@nestjs/common';

import { TenantContext, TenantResolver } from './tenant.types';

export const TENANT_RESOLVER = Symbol('TENANT_RESOLVER');

@Injectable()
export class TenantService {
  constructor(
    @Inject(TENANT_RESOLVER) private readonly resolver: TenantResolver,
  ) {}

  resolve(hostname: string, tenantId?: string): Promise<TenantContext | null> {
    return tenantId ? this.resolver.resolve(hostname, tenantId) : this.resolver.resolve(hostname);
  }
}
