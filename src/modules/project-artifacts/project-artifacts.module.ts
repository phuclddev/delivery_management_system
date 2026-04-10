import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectArtifactsController } from './project-artifacts.controller';
import { ProjectArtifactsService } from './project-artifacts.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectArtifactsController],
  providers: [ProjectArtifactsService],
  exports: [ProjectArtifactsService],
})
export class ProjectArtifactsModule {}

