import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';

import { AuthenticatedUser, AuthenticationTokenVerifier } from './auth.types';

@Injectable()
export class JwtAuthenticationService implements AuthenticationTokenVerifier {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet> | null;
  private readonly issuer: string | undefined;
  private readonly audience: string | undefined;

  constructor(private readonly config: ConfigService) {
    const jwksUrl = this.config.get<string>('auth.jwksUrl');
    this.issuer = this.config.get<string>('auth.issuer');
    this.audience = this.config.get<string>('auth.audience');
    this.jwks = jwksUrl ? createRemoteJWKSet(new URL(jwksUrl)) : null;
  }

  async verify(token: string): Promise<AuthenticatedUser> {
    if (!this.jwks || !this.issuer || !this.audience) {
      throw new ServiceUnavailableException(
        'Authentication provider is not configured',
      );
    }

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['RS256'],
      });

      if (!payload.sub) {
        throw new UnauthorizedException('Authenticated token has no subject');
      }

      return {
        subject: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        displayName:
          typeof payload.name === 'string' ? payload.name : undefined,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid authentication token');
    }
  }
}
