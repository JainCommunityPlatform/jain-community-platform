import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ProfileService } from './profile.service';

@Controller('profile-migrations')
export class ProfileMigrationController {
  constructor(private readonly profiles: ProfileService) {}

  private assertIntegrationKey(value: string | undefined): void {
    if (!process.env.JCP_INTERNAL_TOKEN || value !== process.env.JCP_INTERNAL_TOKEN) {
      throw new UnauthorizedException('Internal integration key is required');
    }
  }

  @Post('provision')
  provision(@Headers('x-jcp-internal-token') key: string | undefined, @Body() body: { value: string; displayName?: string; address?: string }) {
    this.assertIntegrationKey(key);
    return this.profiles.provisionByContact(body);
  }

  @Post('activities')
  async activity(@Headers('x-jcp-internal-token') key: string | undefined, @Body() body: { userId: string; tenantId?: string; eventType: string; eventId: string; title: string; participatedAt: string }) {
    this.assertIntegrationKey(key);
    await this.profiles.recordActivity(body);
    return { recorded: true };
  }
}
