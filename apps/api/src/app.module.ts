import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { configuration } from './config/configuration';
import { AuthorizationModule } from './authorization/authorization.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { TenantModule } from './tenant/tenant.module';
import { IdentityModule } from './identity/identity.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
      load: [configuration],
    }),
    AuthModule,
    AuthorizationModule,
    DatabaseModule,
    HealthModule,
    IdentityModule,
    TenantModule,
  ],
})
export class AppModule {}
