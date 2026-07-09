import { IsEnum, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ResultType } from '../result.enums';
import { CreateImagingData } from './create-imaging-data.input';

export class CreateResultWithImagingInput {
  @ApiProperty({ example: '41711ec5-7f87-4cbc-9200-55849a597dc0' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ example: '72d49761-2a65-446d-b025-15a74cac1ad4' })
  @IsString()
  doctorId!: string;

  @ApiProperty({ enum: ResultType, example: ResultType.IMAGING })
  @IsEnum(ResultType)
  type!: ResultType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  conclusion?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  examenId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  prescriberId?: string;

  @ApiProperty({ type: CreateImagingData })
  @ValidateNested()
  @Type(() => CreateImagingData)
  imagingData!: CreateImagingData;
}
