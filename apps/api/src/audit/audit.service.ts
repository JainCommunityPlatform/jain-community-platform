import { Injectable } from '@nestjs/common';

import { FirestoreService } from '../database/firestore.service';
import { MembershipContextStore } from '../authorization/membership-context.store';
import { AuthContextStore } from '../auth/auth-context.store';
import { UserIdentityService } from '../identity/user-identity.service';
import { AuditEvent, AuditRecord } from './audit.types';

@Injectable()
export class AuditService {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly membershipContext: MembershipContextStore,
    private readonly authContext: AuthContextStore,
    private readonly identity: UserIdentityService,
  ) {}

  async record(event: AuditEvent): Promise<AuditRecord> {
    const authorization = this.membershipContext.get();
    const authenticated = this.authContext.get();
    const currentUser = authenticated ? await this.identity.resolve(authenticated) : null;
    const record: AuditRecord = {
      ...event,
      tenantId: authorization?.tenantId || undefined,
      userId: authorization?.userId || currentUser?.id,
    };

    await this.firestore.recordAudit(record);

    return record;
  }
}
