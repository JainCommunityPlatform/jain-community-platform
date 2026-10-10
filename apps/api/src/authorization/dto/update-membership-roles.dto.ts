import { ArrayNotEmpty, ArrayUnique, IsArray, IsIn, IsString } from 'class-validator';

const TENANT_ROLES = [
  'TENANT_ADMIN',
  'CONTENT_MANAGER',
  'EVENT_MANAGER',
  'INVENTORY_MANAGER',
  'FINANCE_VIEWER',
  'FINANCE_OPERATOR',
  'FINANCE_APPROVER',
  'CA_AUDITOR',
];

export class UpdateMembershipRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  @IsIn(TENANT_ROLES, { each: true })
  roles!: string[];
}
