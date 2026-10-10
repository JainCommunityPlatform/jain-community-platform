import { IsBoolean } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsBoolean()
  email!: boolean;

  @IsBoolean()
  whatsapp!: boolean;

  @IsBoolean()
  push!: boolean;
}
