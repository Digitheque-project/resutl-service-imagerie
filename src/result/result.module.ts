import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';

import { Result } from './entities/result.entity';
import { LabResult } from './entities/lab-result.entity';
import { ImagingResult } from './entities/imaging-result.entity';

import { ResultService } from './result.service';
import { ResultController } from './result.controller';
import { ArchiveModule } from '../archive/archive.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Result, LabResult, ImagingResult]),
    MulterModule.register({}),
    ArchiveModule,
  ],
  controllers: [ResultController],
  providers: [ResultService],
})
export class ResultModule {}
