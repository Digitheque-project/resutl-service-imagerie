import { Global, Module } from '@nestjs/common';
import { PatientClientService } from './patient-client.service';

@Global()
@Module({
  providers: [PatientClientService],
  exports: [PatientClientService],
})
export class PatientClientModule {}
