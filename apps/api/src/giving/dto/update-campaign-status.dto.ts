import { IsIn } from 'class-validator';

export class UpdateCampaignStatusDto {
  @IsIn(['DRAFT', 'ACTIVE', 'CLOSED'])
  status!: 'DRAFT' | 'ACTIVE' | 'CLOSED';
}
