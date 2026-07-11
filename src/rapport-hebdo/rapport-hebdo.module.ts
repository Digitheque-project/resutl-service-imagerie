import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RapportHebdo } from './rapport-hebdo.entity';
import { RapportHebdoService } from './rapport-hebdo.service';
import { RapportHebdoController } from './rapport-hebdo.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RapportHebdo])],
  providers: [RapportHebdoService],
  controllers: [RapportHebdoController],
  exports: [RapportHebdoService],
})
export class RapportHebdoModule {}
