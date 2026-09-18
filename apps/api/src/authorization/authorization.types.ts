export type MembershipRole =
  | 'TENANT_ADMIN'
  | 'CONTENT_MANAGER'
  | 'EVENT_MANAGER'
  | 'INVENTORY_MANAGER'
  | 'FINANCE_VIEWER'
  | 'FINANCE_OPERATOR'
  | 'FINANCE_APPROVER'
  | 'CA_AUDITOR';

export type Permission =
  | 'tenant.read'
  | 'tenant.manage'
  | 'content.manage'
  | 'events.manage'
  | 'inventory.manage'
  | 'finance.read'
  | 'finance.write'
  | 'finance.approve'
  | 'audit.read';

export interface AuthorizationContext {
  userId: string;
  tenantId: string;
  membership: {
    userId: string;
    tenantId: string;
    role: MembershipRole;
  } | null;
}
