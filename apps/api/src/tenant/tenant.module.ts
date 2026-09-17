import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { PrismaTenantResolver } from './prisma-tenant.resolver';
import { TENANT_RESOLVER, TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [TenantController],
  providers: [
    PrismaTenantResolver,
    TenantService,
    {
      provide: TENANT_RESOLVER,
      useExisting: PrismaTenantResolver,
    },
  ],
  exports: [TenantService],
})
export class TenantModule {}
