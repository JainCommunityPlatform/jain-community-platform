import {
  Controller,
  Get,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { AuthContextStore } from './auth-context.store';
import { AuthenticationContextInterceptor } from './authentication-context.interceptor';
import { AuthenticationGuard } from './authentication.guard';
import { AuthenticatedUser } from './auth.types';
import { MembershipContextInterceptor } from '../authorization/membership-context.interceptor';
import { MembershipContextStore } from '../authorization/membership-context.store';

export interface AuthenticatedUserContext extends AuthenticatedUser {
  userId: string;
  tenantId?: string;
  role?: string;
}

@Controller('auth')
@UseGuards(AuthenticationGuard)
@UseInterceptors(
  AuthenticationContextInterceptor,
  MembershipContextInterceptor,
)
export class AuthController {
  constructor(
    private readonly authContext: AuthContextStore,
    private readonly membershipContext: MembershipContextStore,
  ) {}

  @Get('me')
  getCurrentUser(): AuthenticatedUserContext {
    const user = this.authContext.get();

    if (!user) {
      throw new UnauthorizedException('Authenticated user context is missing');
    }

    const authorization = this.membershipContext.get();

    return {
      ...user,
      userId: authorization?.userId ?? '',
      tenantId: authorization?.tenantId || undefined,
      role: authorization?.membership?.role,
    };
  }
}
