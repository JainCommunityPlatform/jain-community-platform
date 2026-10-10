import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class RecordPaymentDto {
  @IsInt()
  @Min(1)
  @Max(100000000000)
  amountPaise!: number;

  @IsIn(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE'])
  method!: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
