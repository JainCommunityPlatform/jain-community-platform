import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { IdentityModule } from '../identity/identity.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { ProfileMigrationController } from './profile-migration.controller';

@Module({
  imports: [AuthModule, AuthorizationModule, IdentityModule],
  controllers: [ProfileController, ProfileMigrationController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}
