import { IsEmail, IsIn } from 'class-validator';

export const FINANCIAL_ROLE_NAMES = [
  'TENANT_FINANCE',
  'FINANCE_VIEWER',
  'FINANCE_OPERATOR',
  'FINANCE_APPROVER',
  'CA_AUDITOR',
] as const;

export class AssignFinanceRoleDto {
  @IsEmail()
  email!: string;

  @IsIn([...FINANCIAL_ROLE_NAMES])
  role!: (typeof FINANCIAL_ROLE_NAMES)[number];
}
