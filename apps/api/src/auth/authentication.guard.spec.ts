import { UnauthorizedException } from '@nestjs/common';

import { AuthenticatedRequest } from './authenticated-request';
import { AuthenticationGuard } from './authentication.guard';
import { JwtAuthenticationService } from './jwt-authentication.service';

describe('AuthenticationGuard', () => {
  it('rejects a missing bearer token', async () => {
    const authentication = {
      verify: jest.fn(),
    } as unknown as JwtAuthenticationService;
    const guard = new AuthenticationGuard(authentication);
    const request: AuthenticatedRequest = {
      header: jest.fn().mockReturnValue(undefined),
    } as unknown as AuthenticatedRequest;

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
    const request: AuthenticatedRequest = {
      header: jest.fn().mockReturnValue('Bearer token-value'),
    } as unknown as AuthenticatedRequest;

    await expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => request }),
      } as never),
    ).resolves.toBe(true);

    expect(authentication.verify).toHaveBeenCalledWith('token-value');
    expect(request.user).toEqual(user);
  });
});
