import { UnauthorizedException } from '@nestjs/common';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { AuthContextStore } from './auth-context.store';
import { AuthController } from './auth.controller';
import { MembershipContextStore } from '../authorization/membership-context.store';
import { UserIdentityService } from '../identity/user-identity.service';

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
          roles: ['TENANT_ADMIN'],
        },
      }),
    } as unknown as MembershipContextStore;
    const identity = { resolve: jest.fn().mockResolvedValue({ id: 'database-user-1', platformRoles: [] }) } as unknown as UserIdentityService;
    const controller = new AuthController(authStore, membershipStore, identity);

    return controller.getCurrentUser().then((result) => expect(result).toEqual({
      ...user,
      userId: 'database-user-1',
      tenantId: 'tenant-1',
      role: 'TENANT_ADMIN',
      roles: [],
      platformRoles: [],
    }));
  });

  it('rejects when the authenticated user context is missing', () => {
    const authStore = {
      get: jest.fn().mockReturnValue(null),
    } as unknown as AuthContextStore;
    const membershipStore = {
      get: jest.fn(),
    } as unknown as MembershipContextStore;
    const identity = { resolve: jest.fn() } as unknown as UserIdentityService;
    const controller = new AuthController(authStore, membershipStore, identity);

    return expect(controller.getCurrentUser()).rejects.toThrow(UnauthorizedException);
  });

  it('returns the global user id even when no tenant is resolved', () => {
    const authStore = {
      get: jest.fn().mockReturnValue({ subject: 'user-1' }),
    } as unknown as AuthContextStore;
    const membershipStore = {
      get: jest.fn().mockReturnValue(null),
    } as unknown as MembershipContextStore;
    const identity = { resolve: jest.fn().mockResolvedValue({ id: 'database-user-1', platformRoles: [] }) } as unknown as UserIdentityService;
    const controller = new AuthController(authStore, membershipStore, identity);

    return controller.getCurrentUser().then((result) => expect(result).toEqual({
      subject: 'user-1',
      userId: 'database-user-1',
      roles: [],
      platformRoles: [],
    }));
  });
});
