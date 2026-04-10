import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('system')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        service: 'delivery-management-api',
      },
    },
  })
  healthCheck() {
    return this.appService.healthCheck();
  }
}

