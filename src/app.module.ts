import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ResultModule } from './result/result.module';
import { ArchiveModule } from './archive/archive.module';
import { StorageClientModule } from './storage-client/storage-client.module';
import { UploadTestModule } from './upload-test/upload-test.module';
import { PatientClientModule } from './patient-client/patient-client.module';
import { RapportHebdoModule } from './rapport-hebdo/rapport-hebdo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('DATABASE_URL');
        if (url) {
          return { type: 'postgres', url, autoLoadEntities: true, synchronize: true, ssl: { rejectUnauthorized: false } };
        }
        return {
          type:             'postgres',
          host:             config.get('DB_HOST'),
          port:             +config.get('DB_PORT'),
          username:         config.get('DB_USERNAME'),
          password:         config.get('DB_PASSWORD'),
          database:         config.get('DB_NAME'),
          autoLoadEntities: true,
          synchronize:      true,
        };
      },
    }),

    ArchiveModule,
    StorageClientModule,
    UploadTestModule,
    PatientClientModule,
    ResultModule,
    RapportHebdoModule,
  ],
})
export class AppModule {}
