import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class TenantAdminDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;
}
