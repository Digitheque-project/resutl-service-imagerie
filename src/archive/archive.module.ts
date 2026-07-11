import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Archive } from './archive.entity';
import { ArchiveService } from './archive.service';
import { ArchiveController } from './archive.controller';
import { PatientClientModule } from '../patient-client/patient-client.module';
import { UserClientModule } from '../user-client/user-client.module';

@Module({
  imports: [TypeOrmModule.forFeature([Archive]), PatientClientModule, UserClientModule],
  providers: [ArchiveService],
  controllers: [ArchiveController],
  exports: [ArchiveService],
})
export class ArchiveModule {}
