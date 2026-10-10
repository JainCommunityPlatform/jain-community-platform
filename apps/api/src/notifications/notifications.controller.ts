import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { AuthenticationContextInterceptor } from '../auth/authentication-context.interceptor';
import { AuthContextStore } from '../auth/auth-context.store';
import { AuthorizationGuard } from '../authorization/authorization.guard';
import { MembershipContextInterceptor } from '../authorization/membership-context.interceptor';
import { UserIdentityService } from '../identity/user-identity.service';
import { TenantContextStore } from '../tenant/tenant-context.store';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthenticationGuard, AuthorizationGuard)
@UseInterceptors(AuthenticationContextInterceptor, MembershipContextInterceptor)
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly tenantContext: TenantContextStore,
    private readonly auth: AuthContextStore,
    private readonly identity: UserIdentityService,
  ) {}

  @Get()
  async listMine() {
    const tenant = this.tenantContext.get();
    if (!tenant) throw new BadRequestException('Tenant context is required');
    const actor = await this.requireActor();
    return this.notifications.listForUser(tenant.id, actor.id);
  }

  @Post(':notificationId/read')
  async markMineRead(@Param('notificationId') notificationId: string) {
    const tenant = this.tenantContext.get();
    if (!tenant) throw new BadRequestException('Tenant context is required');
    const actor = await this.requireActor();
    return this.notifications.markRead(tenant.id, actor.id, notificationId);
  }

  private async requireActor() {
    const authenticated = this.auth.get();
    const actor = authenticated ? await this.identity.resolve(authenticated) : null;
    if (!actor) throw new UnauthorizedException('Authenticated user context is required');
    return actor;
  }
}
