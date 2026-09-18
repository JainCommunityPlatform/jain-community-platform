import { Module } from '@nestjs/common';

import { AuthContextStore } from './auth-context.store';
import { AuthenticationContextInterceptor } from './authentication-context.interceptor';
import { AuthenticationGuard } from './authentication.guard';
import { AuthController } from './auth.controller';
import { JwtAuthenticationService } from './jwt-authentication.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthContextStore,
    AuthenticationContextInterceptor,
    AuthenticationGuard,
    JwtAuthenticationService,
  ],
  exports: [AuthContextStore, JwtAuthenticationService, AuthenticationGuard],
})
export class AuthModule {}
