import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { TenantContextModule } from '../tenant/tenant-context.module';
import { FirebaseStorageService } from './firebase-storage.service';
import { WebsiteController } from './website.controller';
import { WebsiteService } from './website.service';

@Module({
  imports: [AuthModule, AuthorizationModule, AuditModule, DatabaseModule, TenantContextModule],
  controllers: [WebsiteController],
  providers: [WebsiteService, FirebaseStorageService],
  exports: [WebsiteService],
})
export class WebsiteModule {}
