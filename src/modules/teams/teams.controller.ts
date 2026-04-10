import { Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { TeamsService } from './teams.service';

@ApiTags('teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @RequirePermission('teams:view')
  findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  @RequirePermission('teams:view')
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Post()
  @RequirePermission('teams:create')
  create() {
    return this.teamsService.create();
  }

  @Patch(':id')
  @RequirePermission('teams:update')
  update(@Param('id') id: string) {
    return this.teamsService.update(id);
  }

  @Delete(':id')
  @RequirePermission('teams:delete')
  remove(@Param('id') id: string) {
    return this.teamsService.remove(id);
  }
}
