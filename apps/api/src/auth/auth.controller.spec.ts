import { UnauthorizedException } from '@nestjs/common';

import { AuthContextStore } from './auth-context.store';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  it('returns the authenticated user from request context', () => {
    const user = {
      subject: 'user-1',
      email: 'user@example.com',
      displayName: 'User One',
    };
    const store = {
      get: jest.fn().mockReturnValue(user),
    } as unknown as AuthContextStore;
    const controller = new AuthController(store);

    expect(controller.getCurrentUser()).toEqual(user);
  });

  it('rejects when the authenticated user context is missing', () => {
    const store = {
      get: jest.fn().mockReturnValue(null),
    } as unknown as AuthContextStore;
    const controller = new AuthController(store);

    expect(() => controller.getCurrentUser()).toThrow(UnauthorizedException);
  });
});
