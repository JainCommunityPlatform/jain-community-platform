import { Global, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { IdentityModule } from '../identity/identity.module';
import { DatabaseModule } from '../database/database.module';
import { AuditService } from './audit.service';

@Global()
@Module({
  imports: [DatabaseModule, AuthorizationModule, AuthModule, IdentityModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
