import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import envValidation from './config/env.validation';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { MemberLeavesModule } from './modules/member-leaves/member-leaves.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ProjectAllocationsModule } from './modules/project-allocations/project-allocations.module';
import { ProjectArtifactsModule } from './modules/project-artifacts/project-artifacts.module';
import { ProjectEventsModule } from './modules/project-events/project-events.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RequestAssignmentsModule } from './modules/request-assignments/request-assignments.module';
import { RolesModule } from './modules/roles/roles.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RequestsModule } from './modules/requests/requests.module';
import { TeamsModule } from './modules/teams/teams.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [appConfig, databaseConfig],
      validate: envValidation,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    AuthModule,
    IncidentsModule,
    MemberLeavesModule,
    ProjectAllocationsModule,
    ProjectArtifactsModule,
    ProjectEventsModule,
    RequestAssignmentsModule,
    UsersModule,
    TeamsModule,
    RolesModule,
    ReportsModule,
    PermissionsModule,
    RequestsModule,
    ProjectsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
