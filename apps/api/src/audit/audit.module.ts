import { Global, Module } from '@nestjs/common';

import { AuthorizationModule } from '../authorization/authorization.module';
import { DatabaseModule } from '../database/database.module';
import { AuditService } from './audit.service';

@Global()
@Module({
  imports: [DatabaseModule, AuthorizationModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
