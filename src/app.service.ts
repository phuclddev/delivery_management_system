import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  healthCheck() {
    return {
      status: 'ok',
      service: this.configService.get<string>('app.name', 'delivery-management-api'),
    };
  }
}

