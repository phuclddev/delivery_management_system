import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RequestAssignmentsController } from './request-assignments.controller';
import { RequestAssignmentsService } from './request-assignments.service';

@Module({
  imports: [PrismaModule],
  controllers: [RequestAssignmentsController],
  providers: [RequestAssignmentsService],
  exports: [RequestAssignmentsService],
})
export class RequestAssignmentsModule {}
