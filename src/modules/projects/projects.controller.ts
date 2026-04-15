import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RequirePermission('projects:create')
  @ApiBody({ type: CreateProjectDto })
  @ApiOkResponse({ description: 'Create a project.' })
  create(@Body() payload: CreateProjectDto) {
    return this.projectsService.create(payload);
  }

  @Get()
  @RequirePermission('projects:view')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'priority', required: false, description: 'Maps to businessPriority.' })
  @ApiQuery({ name: 'pmOwnerId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @ApiOkResponse({ description: 'List projects with optional filters.' })
  findAll(@Query() query: ProjectQueryDto) {
    return this.projectsService.findAll(query);
  }

  @Get(':id')
  @RequirePermission('projects:view')
  @ApiOkResponse({ description: 'Get a single project.' })
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('projects:update')
  @ApiBody({ type: UpdateProjectDto })
  @ApiOkResponse({ description: 'Update a project.' })
  update(@Param('id') id: string, @Body() payload: UpdateProjectDto) {
    return this.projectsService.update(id, payload);
  }

  @Delete(':id')
  @RequirePermission('projects:delete')
  @ApiOkResponse({ description: 'Delete a project.' })
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }
}
