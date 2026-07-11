import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserClientService } from './user-client.service';

@ApiTags('Users')
@Controller('users')
export class UserClientController {
  constructor(private readonly userClient: UserClientService) {}

  @Get('chu/:chuId')
  @ApiOperation({ summary: 'List users by CHU ID (proxied from gateway)' })
  async getUsersByChu(@Param('chuId') chuId: string) {
    return this.userClient.getUsersByChu(chuId);
  }
}
