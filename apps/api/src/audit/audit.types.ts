export interface AuditEvent {
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface AuditRecord extends AuditEvent {
  tenantId?: string;
  userId?: string;
}
