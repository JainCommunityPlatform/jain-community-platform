import { IsArray, IsBoolean, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateWebsiteConfigDto {
  @IsOptional()
  @IsObject()
  theme?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  header?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  hero?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  quickInfo?: unknown[];

  @IsOptional()
  @IsObject()
  about?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  templeDirectory?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  events?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  gallery?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  seva?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  contact?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  footer?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  _versionNote?: string;

  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}
