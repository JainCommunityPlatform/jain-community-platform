import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { DatabaseModule } from '../database/database.module';
import { WebsiteModule } from '../website/website.module';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';

@Module({
  imports: [AuthModule, AuthorizationModule, AuditModule, DatabaseModule, WebsiteModule],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
