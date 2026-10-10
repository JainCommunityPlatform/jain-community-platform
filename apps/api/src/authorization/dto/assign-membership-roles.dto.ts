import { IsEmail, MaxLength } from 'class-validator';

import { UpdateMembershipRolesDto } from './update-membership-roles.dto';

export class AssignMembershipRolesDto extends UpdateMembershipRolesDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
