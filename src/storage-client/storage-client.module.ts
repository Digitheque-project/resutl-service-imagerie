import { Global, Module } from '@nestjs/common';
import { StorageClientService } from './storage-client.service';

@Global()
@Module({
  providers: [StorageClientService],
  exports: [StorageClientService],
})
export class StorageClientModule {}
