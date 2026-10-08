import { Injectable } from '@nestjs/common';

import { AuthenticatedUser } from '../auth/auth.types';
import { FirestoreService } from '../database/firestore.service';

export interface CurrentUser {
  id: string;
  authSubject: string;
  email?: string;
  displayName?: string;
  platformRoles: string[];
}

@Injectable()
export class UserIdentityService {
  constructor(private readonly firestore: FirestoreService) {}

  async resolve(authenticated: AuthenticatedUser): Promise<CurrentUser> {
    return this.firestore.upsertUser({
      subject: authenticated.subject,
      email: authenticated.email,
      displayName: authenticated.displayName,
    });
  }
}
