import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

import { AuthorizationContext } from './authorization.types';

@Injectable()
export class MembershipContextStore {
  private readonly storage = new AsyncLocalStorage<AuthorizationContext | null>();

  run<T>(context: AuthorizationContext | null, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  get(): AuthorizationContext | null {
    return this.storage.getStore() ?? null;
  }
}
