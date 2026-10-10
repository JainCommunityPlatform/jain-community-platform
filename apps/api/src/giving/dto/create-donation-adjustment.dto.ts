import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateDonationAdjustmentDto {
  @IsIn(['REFUND', 'REVERSAL'])
  kind!: 'REFUND' | 'REVERSAL';

  @IsInt()
  @Min(1)
  @Max(100000000000)
  amountPaise!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  evidenceReferences?: string[];
}
