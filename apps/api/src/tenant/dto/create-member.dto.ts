import { IsIn, IsUUID } from 'class-validator';

import { MembershipRole } from '../../authorization/authorization.types';

const MEMBERSHIP_ROLES: MembershipRole[] = [
  'TENANT_ADMIN',
  'CONTENT_MANAGER',
  'EVENT_MANAGER',
  'INVENTORY_MANAGER',
  'FINANCE_VIEWER',
  'FINANCE_OPERATOR',
  'FINANCE_APPROVER',
  'CA_AUDITOR',
];

export class CreateMemberDto {
  @IsUUID()
  userId!: string;

  @IsIn(MEMBERSHIP_ROLES)
  role!: MembershipRole;
}
