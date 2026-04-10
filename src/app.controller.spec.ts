import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: {
            healthCheck: () => ({
              status: 'ok',
              service: 'delivery-management-api',
            }),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('should return health payload', () => {
    expect(appController.healthCheck()).toEqual({
      status: 'ok',
      service: 'delivery-management-api',
    });
  });
});
