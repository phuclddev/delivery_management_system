import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MemberLeavesController } from './member-leaves.controller';
import { MemberLeavesService } from './member-leaves.service';

@Module({
  imports: [PrismaModule],
  controllers: [MemberLeavesController],
  providers: [MemberLeavesService],
  exports: [MemberLeavesService],
})
export class MemberLeavesModule {}

