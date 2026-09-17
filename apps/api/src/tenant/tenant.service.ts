import { Inject, Injectable } from '@nestjs/common';

import { TenantContext, TenantResolver } from './tenant.types';

export const TENANT_RESOLVER = Symbol('TENANT_RESOLVER');

@Injectable()
export class TenantService {
  constructor(
    @Inject(TENANT_RESOLVER) private readonly resolver: TenantResolver,
  ) {}

  resolve(hostname: string): Promise<TenantContext | null> {
    return this.resolver.resolve(hostname);
  }
}
