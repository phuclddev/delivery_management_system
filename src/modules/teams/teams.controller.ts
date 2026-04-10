import { Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiOkResponse({ description: 'List teams.' })
  findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  @RequirePermission('teams:view')
  @ApiOkResponse({ description: 'Get a single team.' })
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Post()
  @RequirePermission('teams:create')
  @ApiOkResponse({ description: 'Create a team.' })
  create() {
    return this.teamsService.create();
  }

  @Patch(':id')
  @RequirePermission('teams:update')
  @ApiOkResponse({ description: 'Update a team.' })
  update(@Param('id') id: string) {
    return this.teamsService.update(id);
  }

  @Delete(':id')
  @RequirePermission('teams:delete')
  @ApiOkResponse({ description: 'Delete a team.' })
  remove(@Param('id') id: string) {
    return this.teamsService.remove(id);
  }
}
