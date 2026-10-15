import { UnauthorizedException } from '@nestjs/common';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { AuthenticatedRequest } from './authenticated-request';
import { AuthenticationGuard } from './authentication.guard';
import { JwtAuthenticationService } from './jwt-authentication.service';

describe('AuthenticationGuard', () => {
  const makeContext = (request: AuthenticatedRequest) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as never;

  it('rejects a missing bearer token', async () => {
    const authentication = {
      verify: jest.fn(),
    } as unknown as JwtAuthenticationService;
    const guard = new AuthenticationGuard(authentication);
    const request: AuthenticatedRequest = {
      header: jest.fn().mockReturnValue(undefined),
    } as unknown as AuthenticatedRequest;

    await expect(guard.canActivate(makeContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(authentication.verify).not.toHaveBeenCalled();
  });

  it('rejects a non-Bearer authorization scheme before token verification', async () => {
    const authentication = {
      verify: jest.fn(),
    } as unknown as JwtAuthenticationService;
    const guard = new AuthenticationGuard(authentication);
    const request: AuthenticatedRequest = {
      header: jest.fn().mockReturnValue('Basic token-value'),
    } as unknown as AuthenticatedRequest;

    await expect(guard.canActivate(makeContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(authentication.verify).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
  });

  it('rejects a bearer scheme without a token', async () => {
    const authentication = {
      verify: jest.fn(),
    } as unknown as JwtAuthenticationService;
    const guard = new AuthenticationGuard(authentication);
    const request: AuthenticatedRequest = {
      header: jest.fn().mockReturnValue('bEaReR   '),
    } as unknown as AuthenticatedRequest;

    await expect(guard.canActivate(makeContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(authentication.verify).not.toHaveBeenCalled();
    expect(request.user).toBeUndefined();
  });

  it('accepts the bearer authentication scheme case-insensitively', async () => {
    const user = { subject: 'user-1', email: 'user@example.com' };
    const authentication = {
      verify: jest.fn().mockResolvedValue(user),
    } as unknown as JwtAuthenticationService;
    const guard = new AuthenticationGuard(authentication);
    const request: AuthenticatedRequest = {
      header: jest.fn().mockReturnValue('bEaReR token-value'),
    } as unknown as AuthenticatedRequest;

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);

    expect(authentication.verify).toHaveBeenCalledWith('token-value');
    expect(request.user).toEqual(user);
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

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);

    expect(authentication.verify).toHaveBeenCalledWith('token-value');
    expect(request.user).toEqual(user);
  });
});
