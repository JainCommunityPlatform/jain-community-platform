import { IsString } from 'class-validator';

export class LinkContactDto {
  @IsString()
  value!: string;
}
