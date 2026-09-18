import { AuthContextStore } from './auth-context.store';

describe('AuthContextStore', () => {
  it('propagates the authenticated user through async work', async () => {
    const store = new AuthContextStore();
    const user = { subject: 'user-1', email: 'user@example.com' };

    await store.run(user, async () => {
      await Promise.resolve();
      expect(store.get()).toEqual(user);
    });
  });

  it('returns null outside an authenticated context', () => {
    const store = new AuthContextStore();

    expect(store.get()).toBeNull();
  });
});
