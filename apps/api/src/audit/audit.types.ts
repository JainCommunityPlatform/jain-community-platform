import { Prisma } from '@prisma/client';

export interface AuditEvent {
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}

export interface AuditRecord extends AuditEvent {
  tenantId?: string;
  userId?: string;
}
