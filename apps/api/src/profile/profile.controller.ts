import { Body, Controller, Get, Param, Patch, Post, UnauthorizedException, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { AuthContextStore } from '../auth/auth-context.store';
import { AuthenticationContextInterceptor } from '../auth/authentication-context.interceptor';
import { AuthorizationGuard } from '../authorization/authorization.guard';
import { MembershipContextInterceptor } from '../authorization/membership-context.interceptor';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { MembershipContextStore } from '../authorization/membership-context.store';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { LinkContactDto } from './dto/link-contact.dto';

@Controller('profile')
@UseGuards(AuthenticationGuard)
@UseInterceptors(AuthenticationContextInterceptor, MembershipContextInterceptor)
export class ProfileController {
  constructor(private readonly profiles: ProfileService, private readonly auth: AuthContextStore, private readonly membership: MembershipContextStore) {}

  @Get()
  get() {
    const user = this.auth.get();
    if (!user) throw new UnauthorizedException('Authenticated user context is missing');
    return this.profiles.getCurrent(user);
  }

  @Patch()
  update(@Body() dto: UpdateProfileDto) {
    const user = this.auth.get();
    if (!user) throw new UnauthorizedException('Authenticated user context is missing');
    return this.profiles.updateCurrent(user, dto);
  }

  @Post('contact')
  linkContact(@Body() dto: LinkContactDto) {
    const user = this.auth.get();
    if (!user) throw new UnauthorizedException('Authenticated user context is missing');
    return this.profiles.linkCurrentContact(user, dto.value);
  }

  @Get('activities')
  activities() {
    const user = this.auth.get();
    if (!user) throw new UnauthorizedException('Authenticated user context is missing');
    return this.profiles.activities(user);
  }

  @Patch(':userId/contact')
  @UseGuards(AuthorizationGuard)
  @RequirePermission('tenant.manage')
  adminSetContact(@Param('userId') userId: string, @Body() dto: LinkContactDto) {
    return this.profiles.adminSetContact(userId, dto.value, this.membership.get()?.tenantId);
  }

}
