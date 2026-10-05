import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';

export class RecordActivityDto {
  @IsString() @MaxLength(80) eventType!: string;
  @IsString() @MaxLength(120) eventId!: string;
  @IsString() @MaxLength(200) title!: string;
  @IsISO8601() participatedAt!: string;
  @IsOptional() @IsString() tenantId?: string;
  @IsString() userId!: string;
}
