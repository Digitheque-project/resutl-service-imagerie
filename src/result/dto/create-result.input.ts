import { IsEnum, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ResultType } from '../result.enums';

export class CreateResultInput {
  @ApiProperty({ example: '41711ec5-7f87-4cbc-9200-55849a597dc0' })
  @IsUUID()
  patientId!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  doctorId!: number;

  @ApiProperty({ enum: ResultType, example: ResultType.LAB })
  @IsEnum(ResultType)
  type!: ResultType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
