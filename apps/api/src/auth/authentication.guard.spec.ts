import { UnauthorizedException } from '@nestjs/common';

import { AuthenticationGuard } from './authentication.guard';
import { JwtAuthenticationService } from './jwt-authentication.service';

describe('AuthenticationGuard', () => {
  it('rejects a missing bearer token', async () => {
    const authentication = {
      verify: jest.fn(),
    } as unknown as JwtAuthenticationService;
    const guard = new AuthenticationGuard(authentication);
    const request = {
      header: jest.fn().mockReturnValue(undefined),
    };

    await expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => request }),
      } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(authentication.verify).not.toHaveBeenCalled();
  });

  it('verifies the bearer token and attaches the authenticated user', async () => {
    const user = { subject: 'user-1', email: 'user@example.com' };
    const authentication = {
      verify: jest.fn().mockResolvedValue(user),
    } as unknown as JwtAuthenticationService;
    const guard = new AuthenticationGuard(authentication);
    const request = {
      header: jest.fn().mockReturnValue('Bearer token-value'),
    };

    await expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => request }),
      } as never),
    ).resolves.toBe(true);

    expect(authentication.verify).toHaveBeenCalledWith('token-value');
    expect(request.user).toEqual(user);
  });
});
