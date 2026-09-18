import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { UserIdentityService } from './user-identity.service';

@Module({
  imports: [DatabaseModule],
  providers: [UserIdentityService],
  exports: [UserIdentityService],
})
export class IdentityModule {}
