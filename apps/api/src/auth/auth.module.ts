import { Module } from '@nestjs/common';

import { AuthorizationModule } from '../authorization/authorization.module';
import { IdentityModule } from '../identity/identity.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuthContextStore } from './auth-context.store';
import { AuthenticationContextInterceptor } from './authentication-context.interceptor';
import { AuthenticationGuard } from './authentication.guard';
import { AuthController } from './auth.controller';
import { JwtAuthenticationService } from './jwt-authentication.service';

@Module({
  imports: [AuthorizationModule, IdentityModule, TenantModule],
  controllers: [AuthController],
  providers: [
    AuthContextStore,
    AuthenticationContextInterceptor,
    AuthenticationGuard,
    JwtAuthenticationService,
  ],
  exports: [
    AuthContextStore,
    JwtAuthenticationService,
    AuthenticationGuard,
  ],
})
export class AuthModule {}
