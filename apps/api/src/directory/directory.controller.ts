import { Controller, Get } from '@nestjs/common';

import { FirestoreService } from '../database/firestore.service';

@Controller('directory')
export class DirectoryController {
  constructor(private readonly firestore: FirestoreService) {}

  @Get('temples')
  listTemples() {
    return this.firestore.listPublicTenants();
  }
}
