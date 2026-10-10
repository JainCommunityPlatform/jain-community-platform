import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { DatabaseModule } from '../database/database.module';
import { IdentityModule } from '../identity/identity.module';
import { TenantContextModule } from '../tenant/tenant-context.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationEventDispatcher } from './notification-event-dispatcher.service';
import { NotificationRetryWorker } from './notification-retry.worker';
import { NotificationEventDispatcher } from './notification-event-dispatcher.service';

@Module({
  imports: [AuthModule, AuthorizationModule, DatabaseModule, IdentityModule, TenantContextModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationDeliveryService, NotificationEventDispatcher, NotificationRetryWorker],
  exports: [NotificationDeliveryService, NotificationEventDispatcher],
})
export class NotificationsModule {}
