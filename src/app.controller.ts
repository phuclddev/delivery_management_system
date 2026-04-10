import { Controller, Get } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from './common/swagger/api-response.decorator';
import { AppService } from './app.service';

class HealthCheckDto {
  @ApiProperty({ example: 'ok' })
  status!: string;

  @ApiProperty({ example: 'delivery-management-api' })
  service!: string;
}

@ApiTags('system')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiSuccessResponse(HealthCheckDto, 'Check service health.')
  healthCheck() {
    return this.appService.healthCheck();
  }
}
