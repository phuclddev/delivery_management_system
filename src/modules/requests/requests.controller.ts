import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
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
import { ProjectsService } from '../projects/projects.service';
import { ConvertRequestToProjectDto } from '../projects/dto/convert-request-to-project.dto';
import { CreateRequestDto } from './dto/create-request.dto';
import { RequestQueryDto } from './dto/request-query.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { RequestsService } from './requests.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('requests')
export class RequestsController {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Post()
  @RequirePermission('requests:create')
  @ApiBody({ type: CreateRequestDto })
  @ApiOkResponse({ description: 'Create a request.' })
  create(
    @Body() payload: CreateRequestDto,
    @Req() request: { user: AuthenticatedUser },
  ) {
    return this.requestsService.create(payload, request.user);
  }

  @Get()
  @RequirePermission('requests:view', 'requests:view_own')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'teamId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'requestType', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @ApiOkResponse({ description: 'List requests with optional filters.' })
  findAll(
    @Query() query: RequestQueryDto,
    @Req() request: { user: AuthenticatedUser },
  ) {
    return this.requestsService.findAll(query, request.user);
  }

  @Get(':id')
  @RequirePermission('requests:view', 'requests:view_own')
  @ApiOkResponse({ description: 'Get a single request.' })
  findOne(
    @Param('id') id: string,
    @Req() request: { user: AuthenticatedUser },
  ) {
    return this.requestsService.findOne(id, request.user);
  }

  @Patch(':id')
  @RequirePermission('requests:update', 'requests:update_own')
  @ApiBody({ type: UpdateRequestDto })
  @ApiOkResponse({ description: 'Update a request.' })
  update(
    @Param('id') id: string,
    @Body() payload: UpdateRequestDto,
    @Req() request: { user: AuthenticatedUser },
  ) {
    return this.requestsService.update(id, payload, request.user);
  }

  @Delete(':id')
  @RequirePermission('requests:delete')
  @ApiOkResponse({ description: 'Delete a request.' })
  remove(@Param('id') id: string) {
    return this.requestsService.remove(id);
  }

  @Post(':id/convert-to-project')
  @RequirePermission('projects:create')
  @ApiBody({ type: ConvertRequestToProjectDto, required: false })
  @ApiOkResponse({ description: 'Convert a request into a project.' })
  convertToProject(
    @Param('id') id: string,
    @Body() payload: ConvertRequestToProjectDto = {},
  ) {
    return this.projectsService.convertRequestToProject(id, payload);
  }
}
