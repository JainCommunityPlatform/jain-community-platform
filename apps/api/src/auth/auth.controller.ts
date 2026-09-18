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

@Controller('auth')
@UseGuards(AuthenticationGuard)
@UseInterceptors(AuthenticationContextInterceptor)
export class AuthController {
  constructor(private readonly authContext: AuthContextStore) {}

  @Get('me')
  getCurrentUser(): AuthenticatedUser {
    const user = this.authContext.get();

    if (!user) {
      throw new UnauthorizedException('Authenticated user context is missing');
    }

    return user;
  }
}
