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
import { CreateRequestAssignmentBeProfileDto } from './dto/create-request-assignment-be-profile.dto';
import { CreateRequestAssignmentDto } from './dto/create-request-assignment.dto';
import { CreateRequestAssignmentFeProfileDto } from './dto/create-request-assignment-fe-profile.dto';
import { CreateRequestAssignmentSystemProfileDto } from './dto/create-request-assignment-system-profile.dto';
import { RequestAssignmentQueryDto } from './dto/request-assignment-query.dto';
import { UpdateRequestAssignmentBeProfileDto } from './dto/update-request-assignment-be-profile.dto';
import { UpdateRequestAssignmentDto } from './dto/update-request-assignment.dto';
import { UpdateRequestAssignmentFeProfileDto } from './dto/update-request-assignment-fe-profile.dto';
import { UpdateRequestAssignmentSystemProfileDto } from './dto/update-request-assignment-system-profile.dto';
import { RequestAssignmentsService } from './request-assignments.service';

@ApiTags('request-assignments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('request-assignments')
export class RequestAssignmentsController {
  constructor(private readonly requestAssignmentsService: RequestAssignmentsService) {}

  @Post()
  @RequirePermission('projects:update')
  @ApiBody({ type: CreateRequestAssignmentDto })
  @ApiOkResponse({ description: 'Create a request assignment.' })
  create(@Body() payload: CreateRequestAssignmentDto) {
    return this.requestAssignmentsService.create(payload);
  }

  @Get()
  @RequirePermission('projects:view')
  @ApiQuery({ name: 'requestId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'memberId', required: false })
  @ApiQuery({ name: 'roleType', required: false })
  @ApiQuery({ name: 'workType', required: false })
  @ApiQuery({ name: 'uncertaintyLevel', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @ApiOkResponse({ description: 'List request assignments with optional filters.' })
  findAll(@Query() query: RequestAssignmentQueryDto) {
    return this.requestAssignmentsService.findAll(query);
  }

  @Get('request/:requestId')
  @RequirePermission('projects:view')
  @ApiOkResponse({ description: 'List assignments by request.' })
  findByRequest(
    @Param('requestId') requestId: string,
    @Query() query: RequestAssignmentQueryDto,
  ) {
    return this.requestAssignmentsService.findByRequest(requestId, query);
  }

  @Get('project/:projectId')
  @RequirePermission('projects:view')
  @ApiOkResponse({ description: 'List assignments by project.' })
  findByProject(
    @Param('projectId') projectId: string,
    @Query() query: RequestAssignmentQueryDto,
  ) {
    return this.requestAssignmentsService.findByProject(projectId, query);
  }

  @Get('member/:memberId')
  @RequirePermission('projects:view')
  @ApiOkResponse({ description: 'List assignments by member.' })
  findByMember(
    @Param('memberId') memberId: string,
    @Query() query: RequestAssignmentQueryDto,
  ) {
    return this.requestAssignmentsService.findByMember(memberId, query);
  }

  @Get(':id')
  @RequirePermission('projects:view')
  @ApiOkResponse({ description: 'Get a single request assignment.' })
  findOne(@Param('id') id: string) {
    return this.requestAssignmentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('projects:update')
  @ApiBody({ type: UpdateRequestAssignmentDto })
  @ApiOkResponse({ description: 'Update a request assignment.' })
  update(@Param('id') id: string, @Body() payload: UpdateRequestAssignmentDto) {
    return this.requestAssignmentsService.update(id, payload);
  }

  @Delete(':id')
  @RequirePermission('projects:delete')
  @ApiOkResponse({ description: 'Delete a request assignment.' })
  remove(@Param('id') id: string) {
    return this.requestAssignmentsService.remove(id);
  }

  @Post(':id/fe-profile')
  @RequirePermission('projects:update')
  @ApiBody({ type: CreateRequestAssignmentFeProfileDto })
  @ApiOkResponse({ description: 'Create a FE complexity profile for an assignment.' })
  createFeProfile(
    @Param('id') id: string,
    @Body() payload: CreateRequestAssignmentFeProfileDto,
  ) {
    return this.requestAssignmentsService.createFeProfile(id, payload);
  }

  @Get(':id/fe-profile')
  @RequirePermission('projects:view')
  @ApiOkResponse({ description: 'Get FE complexity profile for an assignment.' })
  getFeProfile(@Param('id') id: string) {
    return this.requestAssignmentsService.getFeProfile(id);
  }

  @Patch(':id/fe-profile')
  @RequirePermission('projects:update')
  @ApiBody({ type: UpdateRequestAssignmentFeProfileDto })
  @ApiOkResponse({ description: 'Update FE complexity profile for an assignment.' })
  updateFeProfile(
    @Param('id') id: string,
    @Body() payload: UpdateRequestAssignmentFeProfileDto,
  ) {
    return this.requestAssignmentsService.updateFeProfile(id, payload);
  }

  @Post(':id/be-profile')
  @RequirePermission('projects:update')
  @ApiBody({ type: CreateRequestAssignmentBeProfileDto })
  @ApiOkResponse({ description: 'Create a BE complexity profile for an assignment.' })
  createBeProfile(
    @Param('id') id: string,
    @Body() payload: CreateRequestAssignmentBeProfileDto,
  ) {
    return this.requestAssignmentsService.createBeProfile(id, payload);
  }

  @Get(':id/be-profile')
  @RequirePermission('projects:view')
  @ApiOkResponse({ description: 'Get BE complexity profile for an assignment.' })
  getBeProfile(@Param('id') id: string) {
    return this.requestAssignmentsService.getBeProfile(id);
  }

  @Patch(':id/be-profile')
  @RequirePermission('projects:update')
  @ApiBody({ type: UpdateRequestAssignmentBeProfileDto })
  @ApiOkResponse({ description: 'Update BE complexity profile for an assignment.' })
  updateBeProfile(
    @Param('id') id: string,
    @Body() payload: UpdateRequestAssignmentBeProfileDto,
  ) {
    return this.requestAssignmentsService.updateBeProfile(id, payload);
  }

  @Post(':id/system-profile')
  @RequirePermission('projects:update')
  @ApiBody({ type: CreateRequestAssignmentSystemProfileDto })
  @ApiOkResponse({ description: 'Create a system complexity profile for an assignment.' })
  createSystemProfile(
    @Param('id') id: string,
    @Body() payload: CreateRequestAssignmentSystemProfileDto,
  ) {
    return this.requestAssignmentsService.createSystemProfile(id, payload);
  }

  @Get(':id/system-profile')
  @RequirePermission('projects:view')
  @ApiOkResponse({ description: 'Get system complexity profile for an assignment.' })
  getSystemProfile(@Param('id') id: string) {
    return this.requestAssignmentsService.getSystemProfile(id);
  }

  @Patch(':id/system-profile')
  @RequirePermission('projects:update')
  @ApiBody({ type: UpdateRequestAssignmentSystemProfileDto })
  @ApiOkResponse({ description: 'Update system complexity profile for an assignment.' })
  updateSystemProfile(
    @Param('id') id: string,
    @Body() payload: UpdateRequestAssignmentSystemProfileDto,
  ) {
    return this.requestAssignmentsService.updateSystemProfile(id, payload);
  }
}
