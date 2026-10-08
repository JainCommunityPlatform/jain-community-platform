import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';

import { FirestoreService } from '../database/firestore.service';
import { AuthenticatedUser, AuthenticationTokenVerifier } from './auth.types';

@Injectable()
export class JwtAuthenticationService implements AuthenticationTokenVerifier {
  constructor(private readonly firestore: FirestoreService) {}

  async verify(token: string): Promise<AuthenticatedUser> {
    if (!token.trim()) {
      throw new UnauthorizedException('Bearer authentication is required');
    }

    try {
      const decoded = await getAuth(this.firestore.getFirebaseApp()).verifyIdToken(
        token,
      );

      if (!decoded.uid) {
        throw new UnauthorizedException('Authenticated token has no subject');
      }

      return {
        subject: decoded.uid,
        email: typeof decoded.email === 'string' ? decoded.email : undefined,
        displayName:
          typeof decoded.name === 'string' ? decoded.name : undefined,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error instanceof Error && error.message.includes('not initialized')) {
        throw new ServiceUnavailableException(
          'Authentication provider is not configured',
        );
      }

      throw new UnauthorizedException('Invalid authentication token');
    }
  }
}
