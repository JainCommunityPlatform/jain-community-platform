import { Injectable } from '@nestjs/common';

import { FirestoreService } from '../database/firestore.service';
import { MembershipContextStore } from '../authorization/membership-context.store';
import { AuditEvent, AuditRecord } from './audit.types';

@Injectable()
export class AuditService {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly membershipContext: MembershipContextStore,
  ) {}

  async record(event: AuditEvent): Promise<AuditRecord> {
    const authorization = this.membershipContext.get();
    const record: AuditRecord = {
      ...event,
      tenantId: authorization?.tenantId,
      userId: authorization?.userId,
    };

    await this.firestore.recordAudit(record);

    return record;
  }
}
