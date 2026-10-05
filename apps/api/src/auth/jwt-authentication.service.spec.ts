import { ConfigService } from '@nestjs/config';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => ({ jwks: true })),
  jwtVerify: jest.fn(),
}));

import { jwtVerify } from 'jose';
import { JwtAuthenticationService } from './jwt-authentication.service';

describe('JwtAuthenticationService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fails clearly when the authentication provider is not configured', async () => {
    const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;
    const service = new JwtAuthenticationService(config);
    await expect(service.verify('token')).rejects.toMatchObject({ status: 503 });
  });

  it('verifies a token and maps optional claims', async () => {
    const config = {
      get: jest.fn((key: string) => ({
        'auth.jwksUrl': 'https://example.test/jwks',
        'auth.issuer': 'issuer',
        'auth.audience': 'audience',
      } as Record<string, string>)[key]),
    } as unknown as ConfigService;
    (jwtVerify as jest.Mock).mockResolvedValue({ payload: { sub: 'subject-a', email: 'a@test', name: 'A' } });
    const service = new JwtAuthenticationService(config);
    await expect(service.verify('token')).resolves.toEqual({
      subject: 'subject-a',
      email: 'a@test',
      displayName: 'A',
    });
    expect(jwtVerify).toHaveBeenCalled();
  });

  it('rejects a token without a subject', async () => {
    const config = {
      get: jest.fn((key: string) => ({ 'auth.jwksUrl': 'https://example.test/jwks', 'auth.issuer': 'issuer', 'auth.audience': 'audience' } as Record<string, string>)[key]),
    } as unknown as ConfigService;
    (jwtVerify as jest.Mock).mockResolvedValue({ payload: {} });
    await expect(new JwtAuthenticationService(config).verify('token')).rejects.toMatchObject({ status: 401 });
  });

  it('maps provider verification failures to unauthorized', async () => {
    const config = {
      get: jest.fn((key: string) => ({ 'auth.jwksUrl': 'https://example.test/jwks', 'auth.issuer': 'issuer', 'auth.audience': 'audience' } as Record<string, string>)[key]),
    } as unknown as ConfigService;
    (jwtVerify as jest.Mock).mockRejectedValue(new Error('bad token'));
    await expect(new JwtAuthenticationService(config).verify('token')).rejects.toMatchObject({ status: 401 });
  });
});
