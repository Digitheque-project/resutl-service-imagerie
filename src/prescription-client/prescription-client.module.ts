import { Global, Module } from '@nestjs/common';
import { PrescriptionClientService } from './prescription-client.service';

@Global()
@Module({
  providers: [PrescriptionClientService],
  exports: [PrescriptionClientService],
})
export class PrescriptionClientModule {}
