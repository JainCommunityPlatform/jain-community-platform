import { Injectable } from '@nestjs/common';

import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../database/prisma.service';

export interface CurrentUser {
  id: string;
  authSubject: string;
  email?: string;
  displayName?: string;
}

@Injectable()
export class UserIdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(authenticated: AuthenticatedUser): Promise<CurrentUser> {
    const user = await this.prisma.user.upsert({
      where: { authSubject: authenticated.subject },
      create: {
        authSubject: authenticated.subject,
        email: authenticated.email ?? null,
        displayName: authenticated.displayName ?? null,
      },
      update: {
        email: authenticated.email ?? null,
        displayName: authenticated.displayName ?? null,
      },
    });

    return {
      id: user.id,
      authSubject: user.authSubject ?? authenticated.subject,
      email: user.email ?? undefined,
      displayName: user.displayName ?? undefined,
    };
  }
}
