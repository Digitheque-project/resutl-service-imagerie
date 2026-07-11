import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RapportHebdo } from './rapport-hebdo.entity';
import { RapportHebdoService } from './rapport-hebdo.service';
import { RapportHebdoController } from './rapport-hebdo.controller';
import { Result } from '../result/entities/result.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RapportHebdo, Result])],
  providers: [RapportHebdoService],
  controllers: [RapportHebdoController],
  exports: [RapportHebdoService],
})
export class RapportHebdoModule {}
