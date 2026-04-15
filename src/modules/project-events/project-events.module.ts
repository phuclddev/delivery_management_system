import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectEventsController } from './project-events.controller';
import { ProjectEventsService } from './project-events.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectEventsController],
  providers: [ProjectEventsService],
  exports: [ProjectEventsService],
})
export class ProjectEventsModule {}
