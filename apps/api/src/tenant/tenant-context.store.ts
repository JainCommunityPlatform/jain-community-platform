import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

import { TenantContext } from './tenant.types';

@Injectable()
export class TenantContextStore {
  private readonly storage = new AsyncLocalStorage<TenantContext | null>();

  run<T>(tenant: TenantContext | null, callback: () => T): T {
    return this.storage.run(tenant, callback);
  }

  get(): TenantContext | null {
    return this.storage.getStore() ?? null;
  }
}
