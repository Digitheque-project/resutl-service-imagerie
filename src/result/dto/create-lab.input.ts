import { IsInt, IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLabInput {
  @ApiProperty({ example: 1 })
  @IsInt()
  resultId!: number;

  @ApiProperty({ example: 'Glycémie' })
  @IsString()
  testName!: string;

  @ApiProperty({ required: false, example: 5.2 })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiProperty({ required: false, example: 'mmol/L' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  referenceRange?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
