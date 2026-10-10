export type MembershipRole =
  | 'TENANT_ADMIN'
  | 'TENANT_FINANCE'
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
  | 'audit.read'
  | 'platform.tenant.manage'
  | 'platform.finance.team.manage';

export interface AuthorizationContext {
  userId: string;
  tenantId: string;
  platformRoles: string[];
  membership: {
    userId: string;
    tenantId: string;
    role: MembershipRole;
    roles?: MembershipRole[];
  } | null;
}
