import { Global, Module } from '@nestjs/common';
import { UserClientService } from './user-client.service';
import { UserClientController } from './user-client.controller';

@Global()
@Module({
  controllers: [UserClientController],
  providers: [UserClientService],
  exports: [UserClientService],
})
export class UserClientModule {}
