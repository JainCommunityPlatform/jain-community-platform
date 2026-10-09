import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from './authorization.module';
import { DatabaseModule } from '../database/database.module';
import { TenantContextModule } from '../tenant/tenant-context.module';
import { TenantMembershipController } from './tenant-membership.controller';

@Module({
  imports: [AuthModule, AuthorizationModule, DatabaseModule, TenantContextModule],
  controllers: [TenantMembershipController],
})
export class TenantMembershipModule {}
