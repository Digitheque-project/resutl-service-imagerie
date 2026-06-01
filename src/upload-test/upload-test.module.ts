import { Module } from '@nestjs/common';
import { UploadTestController } from './upload-test.controller';

@Module({
  controllers: [UploadTestController],
})
export class UploadTestModule {}
