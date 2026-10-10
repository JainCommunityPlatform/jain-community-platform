import { IsInt, IsString, Max, Min, MinLength } from 'class-validator';

export class CreatePledgeDto {
  @IsString()
  @MinLength(1)
  campaignId!: string;

  @IsInt()
  @Min(1)
  @Max(100000000000)
  pledgedAmountPaise!: number;
}
