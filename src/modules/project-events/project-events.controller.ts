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
import { CreateProjectEventDto } from './dto/create-project-event.dto';
import { ProjectEventQueryDto } from './dto/project-event-query.dto';
import { UpdateProjectEventDto } from './dto/update-project-event.dto';
import { ProjectEventsService } from './project-events.service';

@ApiTags('project-events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('project-events')
export class ProjectEventsController {
  constructor(private readonly projectEventsService: ProjectEventsService) {}

  @Post()
  @RequirePermission('projects:update')
  @ApiBody({ type: CreateProjectEventDto })
  @ApiOkResponse({ description: 'Create a project event.' })
  create(@Body() payload: CreateProjectEventDto) {
    return this.projectEventsService.create(payload);
  }

  @Get()
  @RequirePermission('projects:view')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'requestId', required: false })
  @ApiQuery({ name: 'eventType', required: false })
  @ApiQuery({ name: 'actorUserId', required: false })
  @ApiQuery({ name: 'sourceType', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @ApiOkResponse({ description: 'List project events with optional filters.' })
  findAll(@Query() query: ProjectEventQueryDto) {
    return this.projectEventsService.findAll(query);
  }

  @Get('project/:projectId')
  @RequirePermission('projects:view')
  @ApiOkResponse({ description: 'List project events for a specific project.' })
  findByProject(
    @Param('projectId') projectId: string,
    @Query() query: ProjectEventQueryDto,
  ) {
    return this.projectEventsService.findByProject(projectId, query);
  }

  @Get('request/:requestId')
  @RequirePermission('projects:view')
  @ApiOkResponse({ description: 'List project events for a specific request.' })
  findByRequest(
    @Param('requestId') requestId: string,
    @Query() query: ProjectEventQueryDto,
  ) {
    return this.projectEventsService.findByRequest(requestId, query);
  }

  @Get(':id')
  @RequirePermission('projects:view')
  @ApiOkResponse({ description: 'Get a single project event.' })
  findOne(@Param('id') id: string) {
    return this.projectEventsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('projects:update')
  @ApiBody({ type: UpdateProjectEventDto })
  @ApiOkResponse({ description: 'Update a project event.' })
  update(@Param('id') id: string, @Body() payload: UpdateProjectEventDto) {
    return this.projectEventsService.update(id, payload);
  }

  @Delete(':id')
  @RequirePermission('projects:delete')
  @ApiOkResponse({ description: 'Delete a project event.' })
  remove(@Param('id') id: string) {
    return this.projectEventsService.remove(id);
  }
}
