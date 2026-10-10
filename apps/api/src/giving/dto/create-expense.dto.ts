import { ArrayMaxSize, IsArray, IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @MaxLength(100)
  category!: string;

  @IsString()
  @MaxLength(500)
  description!: string;

  @IsInt()
  @Min(1)
  @Max(100000000000)
  amountPaise!: number;

  @IsOptional()
  @IsDateString()
  incurredAt?: string;

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
