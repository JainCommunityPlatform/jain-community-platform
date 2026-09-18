import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service';
import { MembershipContextStore } from '../authorization/membership-context.store';
import { AuditEvent, AuditRecord } from './audit.types';

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membershipContext: MembershipContextStore,
  ) {}

  async record(event: AuditEvent): Promise<AuditRecord> {
    const authorization = this.membershipContext.get();
    const record: AuditRecord = {
      ...event,
      tenantId: authorization?.tenantId,
      userId: authorization?.userId,
    };

    await this.prisma.auditLog.create({
      data: {
        tenantId: record.tenantId,
        userId: record.userId,
        action: record.action,
        entity: record.entity,
        entityId: record.entityId,
        metadata: record.metadata,
      },
    });

    return record;
  }
}
