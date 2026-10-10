import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { configuration } from './config/configuration';
import { AuthorizationModule } from './authorization/authorization.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { TenantModule } from './tenant/tenant.module';
import { IdentityModule } from './identity/identity.module';
import { ProfileModule } from './profile/profile.module';
import { WebsiteModule } from './website/website.module';
import { PlatformModule } from './platform/platform.module';
import { DirectoryModule } from './directory/directory.module';
import { TenantMembershipModule } from './authorization/tenant-membership.module';
import { GivingModule } from './giving/giving.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      load: [configuration],
    }),
    AuthModule,
    AuditModule,
    AuthorizationModule,
    DatabaseModule,
    HealthModule,
    IdentityModule,
    TenantModule,
    ProfileModule,
    WebsiteModule,
    PlatformModule,
    DirectoryModule,
    TenantMembershipModule,
    GivingModule,
  ],
})
export class AppModule {}
