import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { DirectoryController } from './directory.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [DirectoryController],
})
export class DirectoryModule {}
