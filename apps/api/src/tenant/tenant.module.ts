import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ConfigTenantResolver } from './config-tenant.resolver';
import { TenantController } from './tenant.controller';
import { TenantService, TENANT_RESOLVER } from './tenant.service';

@Module({
  imports: [ConfigModule],
  controllers: [TenantController],
  providers: [
    ConfigTenantResolver,
    TenantService,
    {
      provide: TENANT_RESOLVER,
      useExisting: ConfigTenantResolver,
    },
  ],
  exports: [TenantService],
})
export class TenantModule {}
