import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectAllocationsController } from './project-allocations.controller';
import { ProjectAllocationsService } from './project-allocations.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectAllocationsController],
  providers: [ProjectAllocationsService],
  exports: [ProjectAllocationsService],
})
export class ProjectAllocationsModule {}

