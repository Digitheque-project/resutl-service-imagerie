import { IsEnum, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ResultType } from '../result.enums';
import { CreateLabData } from './create-lab-data.input';

export class CreateResultWithLabInput {
  @ApiProperty({ example: '41711ec5-7f87-4cbc-9200-55849a597dc0' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ example: '72d49761-2a65-446d-b025-15a74cac1ad4' })
  @IsString()
  doctorId!: string;

  @ApiProperty({ enum: ResultType, example: ResultType.LAB })
  @IsEnum(ResultType)
  type!: ResultType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: CreateLabData })
  @ValidateNested()
  @Type(() => CreateLabData)
  labData!: CreateLabData;
}
