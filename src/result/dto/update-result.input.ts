import { PartialType } from '@nestjs/mapped-types';
import { CreateResultInput } from './create-result.input';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateResultInput extends PartialType(CreateResultInput) {
  @ApiProperty({ example: 1 })
  id!: number;
}
