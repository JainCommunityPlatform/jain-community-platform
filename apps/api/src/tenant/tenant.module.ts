import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { IdentityModule } from '../identity/identity.module';
import { PrismaTenantResolver } from './prisma-tenant.resolver';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { TenantContextModule } from './tenant-context.module';
import { TENANT_RESOLVER, TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { TenantMemberController } from './tenant-member.controller';
import { TenantMemberService } from './tenant-member.service';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [DatabaseModule, IdentityModule, TenantContextModule, AuthorizationModule, AuditModule],
  controllers: [TenantController, TenantMemberController],
  providers: [
    PrismaTenantResolver,
    TenantContextMiddleware,
    TenantService,
    TenantMemberService,
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
