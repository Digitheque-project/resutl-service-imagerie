import { Global, Module } from '@nestjs/common';
import { UserClientService } from './user-client.service';

@Global()
@Module({
  providers: [UserClientService],
  exports: [UserClientService],
})
export class UserClientModule {}
