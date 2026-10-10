import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { DatabaseModule } from '../database/database.module';
import { IdentityModule } from '../identity/identity.module';
import { TenantContextModule } from '../tenant/tenant-context.module';
import { GivingController } from './giving.controller';
import { PublicGivingController } from './public-giving.controller';
import { GivingService } from './giving.service';

@Module({
  imports: [
    AuditModule,
    AuthModule,
    AuthorizationModule,
    DatabaseModule,
    IdentityModule,
    TenantContextModule,
  ],
  controllers: [GivingController, PublicGivingController],
  providers: [GivingService],
})
export class GivingModule {}
