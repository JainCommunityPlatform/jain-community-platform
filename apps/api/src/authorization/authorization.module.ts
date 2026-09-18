import { Global, Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { IdentityModule } from '../identity/identity.module';
import { TenantModule } from '../tenant/tenant.module';
import { AuthorizationGuard } from './authorization.guard';
import { AuthorizationPolicy } from './authorization.policy';
import { MembershipContextInterceptor } from './membership-context.interceptor';
import { MembershipContextStore } from './membership-context.store';
import { MembershipService } from './membership.service';

@Global()
@Module({
  imports: [DatabaseModule, IdentityModule, TenantModule],
  providers: [
    AuthorizationGuard,
    AuthorizationPolicy,
    MembershipContextInterceptor,
    MembershipContextStore,
    MembershipService,
  ],
  exports: [
    AuthorizationGuard,
    AuthorizationPolicy,
    MembershipContextInterceptor,
    MembershipContextStore,
    MembershipService,
  ],
})
export class AuthorizationModule {}
