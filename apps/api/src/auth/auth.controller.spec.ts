import { UnauthorizedException } from '@nestjs/common';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { AuthContextStore } from './auth-context.store';
import { AuthController } from './auth.controller';
import { MembershipContextStore } from '../authorization/membership-context.store';

describe('AuthController', () => {
  it('returns the authenticated user and resolved membership context', () => {
    const user = {
      subject: 'user-1',
      email: 'user@example.com',
      displayName: 'User One',
    };
    const authStore = {
      get: jest.fn().mockReturnValue(user),
    } as unknown as AuthContextStore;
    const membershipStore = {
      get: jest.fn().mockReturnValue({
        userId: 'database-user-1',
        tenantId: 'tenant-1',
        membership: {
          userId: 'database-user-1',
          tenantId: 'tenant-1',
          role: 'TENANT_ADMIN',
        },
      }),
    } as unknown as MembershipContextStore;
    const controller = new AuthController(authStore, membershipStore);

    expect(controller.getCurrentUser()).toEqual({
      ...user,
      userId: 'database-user-1',
      tenantId: 'tenant-1',
      role: 'TENANT_ADMIN',
    });
  });

  it('rejects when the authenticated user context is missing', () => {
    const authStore = {
      get: jest.fn().mockReturnValue(null),
    } as unknown as AuthContextStore;
    const membershipStore = {
      get: jest.fn(),
    } as unknown as MembershipContextStore;
    const controller = new AuthController(authStore, membershipStore);

    expect(() => controller.getCurrentUser()).toThrow(UnauthorizedException);
  });

  it('returns the global user id even when no tenant is resolved', () => {
    const authStore = {
      get: jest.fn().mockReturnValue({ subject: 'user-1' }),
    } as unknown as AuthContextStore;
    const membershipStore = {
      get: jest.fn().mockReturnValue(null),
    } as unknown as MembershipContextStore;
    const controller = new AuthController(authStore, membershipStore);

    expect(controller.getCurrentUser()).toEqual({
      subject: 'user-1',
      userId: '',
    });
  });
});
