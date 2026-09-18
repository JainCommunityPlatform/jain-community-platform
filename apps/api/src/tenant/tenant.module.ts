import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { PrismaTenantResolver } from './prisma-tenant.resolver';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { TenantContextStore } from './tenant-context.store';
import { TENANT_RESOLVER, TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [TenantController],
  providers: [
    PrismaTenantResolver,
    TenantContextMiddleware,
    TenantContextStore,
    TenantService,
    {
      provide: TENANT_RESOLVER,
      useExisting: PrismaTenantResolver,
    },
  ],
  exports: [TenantService, TenantContextStore],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
