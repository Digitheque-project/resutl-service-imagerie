import { ApiProperty } from '@nestjs/swagger';
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateLabInput } from './create-lab.input';

export class UpdateLabInput extends PartialType(
  OmitType(CreateLabInput, ['resultId'] as const),
) {
  @ApiProperty({ example: 1 })
  id!: number;
}
