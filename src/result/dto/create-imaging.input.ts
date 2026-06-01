import { IsInt, IsOptional, IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateImagingInput {
  @ApiProperty({ example: 1 })
  @IsInt()
  resultId!: number;

  @ApiProperty({ example: 'Radio thorax' })
  @IsString()
  description!: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imageUrl?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fileUrl?: string;
}
