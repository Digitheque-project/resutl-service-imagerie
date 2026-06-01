import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';

import { Result } from './entities/result.entity';
import { LabResult } from './entities/lab-result.entity';
import { ImagingResult } from './entities/imaging-result.entity';

import { ResultService } from './result.service';
import { ResultController } from './result.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Result, LabResult, ImagingResult]),
    MulterModule.register({}),
  ],
  controllers: [ResultController],
  providers: [ResultService],
})
export class ResultModule {}
