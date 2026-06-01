import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ResultModule } from './result/result.module';
import { StorageClientModule } from './storage-client/storage-client.module';
import { UploadTestModule } from './upload-test/upload-test.module';
import { PatientClientModule } from './patient-client/patient-client.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type:             'postgres',
      host:             'localhost',
      port:             5432,
      username:         'postgres',
      password:         'Madagasikara',
      database:         'result_db',
      autoLoadEntities: true,
      synchronize:      true,
    }),

    StorageClientModule,
    UploadTestModule,
    PatientClientModule,
    ResultModule,
  ],
})
export class AppModule {}
