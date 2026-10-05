import { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { AuthenticationContextInterceptor } from './authentication-context.interceptor';

describe('AuthenticationContextInterceptor', () => {
  it('rejects a request without an authenticated user', () => {
    const interceptor = new AuthenticationContextInterceptor({ run: jest.fn() } as never);
    expect(() => interceptor.intercept(
      { switchToHttp: () => ({ getRequest: () => ({}) }) } as unknown as ExecutionContext,
      { handle: jest.fn() },
    )).toThrow('Authenticated user context is missing');
  });

  it('stores the authenticated user while handling the request', async () => {
    const run = jest.fn((_user, callback) => callback());
    const interceptor = new AuthenticationContextInterceptor({ run } as never);
    const user = { subject: 'google:a', email: 'a@test' };
    const next = { handle: jest.fn().mockReturnValue(of({ ok: true })) };
    await expect(lastValueFrom(interceptor.intercept(
      { switchToHttp: () => ({ getRequest: () => ({ user }) }) } as unknown as ExecutionContext,
      next,
    ))).resolves.toEqual({ ok: true });
    expect(run).toHaveBeenCalledWith(user, expect.any(Function));
  });
});
