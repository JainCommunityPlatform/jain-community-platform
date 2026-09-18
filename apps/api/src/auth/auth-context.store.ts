import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

import { AuthenticatedUser } from './auth.types';

@Injectable()
export class AuthContextStore {
  private readonly storage = new AsyncLocalStorage<AuthenticatedUser | null>();

  run<T>(user: AuthenticatedUser, callback: () => T): T {
    return this.storage.run(user, callback);
  }

  get(): AuthenticatedUser | null {
    return this.storage.getStore() ?? null;
  }
}
