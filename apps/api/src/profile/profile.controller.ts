import { Body, Controller, Get, Headers, Param, Patch, Post, UnauthorizedException, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthenticationGuard } from '../auth/authentication.guard';
import { AuthContextStore } from '../auth/auth-context.store';
import { AuthenticationContextInterceptor } from '../auth/authentication-context.interceptor';
import { AuthorizationGuard } from '../authorization/authorization.guard';
import { MembershipContextInterceptor } from '../authorization/membership-context.interceptor';
import { RequirePermission } from '../authorization/require-permission.decorator';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { LinkContactDto } from './dto/link-contact.dto';
import { RecordActivityDto } from './dto/record-activity.dto';

@Controller('profile')
@UseGuards(AuthenticationGuard)
@UseInterceptors(AuthenticationContextInterceptor, MembershipContextInterceptor)
export class ProfileController {
  constructor(private readonly profiles: ProfileService, private readonly auth: AuthContextStore) {}

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
    return this.profiles.adminSetContact(userId, dto.value);
  }

  @Post('activities')
  async recordActivity(@Headers('x-jcp-internal-token') token: string | undefined, @Body() dto: RecordActivityDto) {
    if (!process.env.JCP_INTERNAL_TOKEN || token !== process.env.JCP_INTERNAL_TOKEN) throw new UnauthorizedException('Internal activity token is required');
    await this.profiles.recordActivity(dto);
    return { recorded: true };
  }
}
