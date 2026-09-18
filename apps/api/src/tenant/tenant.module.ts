import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

import { AuthorizationModule } from '../authorization/authorization.module';
import { DatabaseModule } from '../database/database.module';
import { PrismaTenantResolver } from './prisma-tenant.resolver';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { TenantContextModule } from './tenant-context.module';
import { TENANT_RESOLVER, TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';

@Module({
  imports: [DatabaseModule, TenantContextModule, AuthorizationModule],
  controllers: [TenantController],
  providers: [
    PrismaTenantResolver,
    TenantContextMiddleware,
    TenantService,
    {
      provide: TENANT_RESOLVER,
      useExisting: PrismaTenantResolver,
    },
  ],
  exports: [TenantService, TenantContextModule],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
