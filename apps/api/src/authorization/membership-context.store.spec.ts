import { MembershipContextStore } from './membership-context.store';
import { AuthorizationContext } from './authorization.types';

describe('MembershipContextStore', () => {
  let store: MembershipContextStore;

  beforeEach(() => {
    store = new MembershipContextStore();
  });

  it('returns null when no context is active', () => {
    expect(store.get()).toBeNull();
  });

  it('exposes the context within the callback and returns its result', () => {
    const context = { tenantId: 'tenant-a', userId: 'user-a' } as AuthorizationContext;
    const result = store.run(context, () => store.get());

    expect(result).toBe(context);
    expect(store.get()).toBeNull();
  });

  it('supports a null context without leaking a previous value', () => {
    const context = { tenantId: 'tenant-a', userId: 'user-a' } as AuthorizationContext;
    store.run(context, () => expect(store.get()).toBe(context));
    expect(store.run(null, () => store.get())).toBeNull();
    expect(store.get()).toBeNull();
  });

  it('keeps context scoped to an asynchronous execution', async () => {
    const context = { tenantId: 'tenant-b', userId: 'user-b' } as AuthorizationContext;
    await store.run(context, async () => {
      await Promise.resolve();
      expect(store.get()).toBe(context);
    });
    expect(store.get()).toBeNull();
  });
});
