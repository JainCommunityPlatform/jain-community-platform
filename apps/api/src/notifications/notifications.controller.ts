import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
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
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

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

  @Get('preferences')
  async getMyPreferences() {
    const tenant = this.tenantContext.get();
    if (!tenant) throw new BadRequestException('Tenant context is required');
    const actor = await this.requireActor();
    return this.notifications.getPreferences(tenant.id, actor.id);
  }

  @Put('preferences')
  async updateMyPreferences(@Body() input: UpdateNotificationPreferencesDto) {
    const tenant = this.tenantContext.get();
    if (!tenant) throw new BadRequestException('Tenant context is required');
    const actor = await this.requireActor();
    return this.notifications.updatePreferences({ tenantId: tenant.id, userId: actor.id, ...input });
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
