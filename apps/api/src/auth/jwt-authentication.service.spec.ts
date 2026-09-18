import { ConfigService } from '@nestjs/config';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

import { JwtAuthenticationService } from './jwt-authentication.service';

describe('JwtAuthenticationService', () => {
  it('fails clearly when the authentication provider is not configured', async () => {
    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    const service = new JwtAuthenticationService(config);

    await expect(service.verify('token')).rejects.toMatchObject({
      status: 503,
    });
  });
});
