import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { IdentityModule } from '../identity/identity.module';
import { TenantModule } from '../tenant/tenant.module';
import { MembershipContextInterceptor } from './membership-context.interceptor';
import { MembershipContextStore } from './membership-context.store';
import { MembershipService } from './membership.service';

@Module({
  imports: [AuthModule, DatabaseModule, IdentityModule, TenantModule],
  providers: [
    MembershipContextInterceptor,
    MembershipContextStore,
    MembershipService,
  ],
  exports: [
    MembershipContextInterceptor,
    MembershipContextStore,
    MembershipService,
  ],
})
export class AuthorizationModule {}
