import { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';

import { MembershipContextInterceptor } from './membership-context.interceptor';

describe('MembershipContextInterceptor', () => {
  it('resolves the global user and tenant membership before continuing', async () => {
    const identity = {
      resolve: jest.fn().mockResolvedValue({
        id: 'user-a',
        authSubject: 'subject-a',
      }),
    };
    const membership = {
      resolve: jest.fn().mockResolvedValue({
        userId: 'user-a',
        tenantId: 'tenant-a',
        role: 'CONTENT_MANAGER',
      }),
    };
    const tenantContext = {
      get: jest.fn().mockReturnValue({
        id: 'tenant-a',
        name: 'Tenant A',
        hostname: 'tenant-a.example',
      }),
    };
    const membershipContext = {
      run: jest.fn((_context, callback) => callback()),
    };
    const interceptor = new MembershipContextInterceptor(
      tenantContext as never,
      identity as never,
      membership as never,
      membershipContext as never,
    );
    const request = {
      user: {
        subject: 'subject-a',
        email: 'user@example.com',
      },
    };
    const next = { handle: jest.fn().mockReturnValue(of({ ok: true })) };

    const result = interceptor.intercept(
      {
        switchToHttp: () => ({ getRequest: () => request }),
      } as unknown as ExecutionContext,
      next,
    );

    await expect(lastValueFrom(result)).resolves.toEqual({ ok: true });
    expect(identity.resolve).toHaveBeenCalledWith(request.user);
    expect(membership.resolve).toHaveBeenCalledWith('user-a', 'tenant-a');
    expect(membershipContext.run).toHaveBeenCalledWith(
      {
        userId: 'user-a',
        tenantId: 'tenant-a',
        membership: {
          userId: 'user-a',
          tenantId: 'tenant-a',
          role: 'CONTENT_MANAGER',
        },
      },
      expect.any(Function),
    );
  });

  it('does not invent membership when the request has no resolved tenant', async () => {
    const identity = { resolve: jest.fn() };
    const membership = { resolve: jest.fn() };
    const tenantContext = { get: jest.fn().mockReturnValue(null) };
    const membershipContext = {
      run: jest.fn((_context, callback) => callback()),
    };
    const interceptor = new MembershipContextInterceptor(
      tenantContext as never,
      identity as never,
      membership as never,
      membershipContext as never,
    );
    const next = { handle: jest.fn().mockReturnValue(of({ ok: true })) };

    await expect(
      lastValueFrom(
        interceptor.intercept(
          {
            switchToHttp: () => ({
              getRequest: () => ({ user: { subject: 'subject-a' } }),
            }),
          } as unknown as ExecutionContext,
          next,
        ),
      ),
    ).resolves.toEqual({ ok: true });

    expect(identity.resolve).not.toHaveBeenCalled();
    expect(membership.resolve).not.toHaveBeenCalled();
    expect(membershipContext.run).toHaveBeenCalledWith(
      null,
      expect.any(Function),
    );
  });
});
