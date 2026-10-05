import { IsOptional, IsPostalCode, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(100) displayName?: string;
  @IsOptional() @IsString() @MinLength(5) @MaxLength(250) address?: string;
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(80) state?: string;
  @IsOptional() @IsPostalCode('IN') postalCode?: string;
}
