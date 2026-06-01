import { ApiProperty } from '@nestjs/swagger';
import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateImagingInput } from './create-imaging.input';

export class UpdateImagingInput extends PartialType(
  OmitType(CreateImagingInput, ['resultId'] as const),
) {
  @ApiProperty({ example: 1 })
  id!: number;
}
