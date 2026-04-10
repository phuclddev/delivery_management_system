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
import { CreateProjectAllocationDto } from './dto/create-project-allocation.dto';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { ProjectAllocationQueryDto } from './dto/project-allocation-query.dto';
import { UpdateProjectAllocationDto } from './dto/update-project-allocation.dto';
import { ProjectAllocationsService } from './project-allocations.service';

@ApiTags('project-allocations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('project-allocations')
export class ProjectAllocationsController {
  constructor(private readonly projectAllocationsService: ProjectAllocationsService) {}

  @Post()
  @RequirePermission('allocations:create')
  @ApiBody({ type: CreateProjectAllocationDto })
  @ApiOkResponse({ description: 'Create an allocation record.' })
  create(@Body() payload: CreateProjectAllocationDto) {
    return this.projectAllocationsService.create(payload);
  }

  @Get()
  @RequirePermission('allocations:view')
  @ApiQuery({ name: 'memberId', required: false })
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiOkResponse({ description: 'List allocation records with optional filters.' })
  findAll(@Query() query: ProjectAllocationQueryDto) {
    return this.projectAllocationsService.findAll(query);
  }

  @Get('workload/member/:memberId')
  @RequirePermission('allocations:view')
  @ApiOkResponse({ description: 'Get workload summary for a member in a date range.' })
  getWorkloadByMember(
    @Param('memberId') memberId: string,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.projectAllocationsService.getWorkloadByMember(memberId, query);
  }

  @Get('utilization/team/:teamId')
  @RequirePermission('allocations:view')
  @ApiOkResponse({ description: 'Get team utilization summary for a date range.' })
  getTeamUtilization(
    @Param('teamId') teamId: string,
    @Query() query: DateRangeQueryDto,
  ) {
    return this.projectAllocationsService.getTeamUtilization(teamId, query);
  }

  @Get(':id')
  @RequirePermission('allocations:view')
  @ApiOkResponse({ description: 'Get a single allocation record.' })
  findOne(@Param('id') id: string) {
    return this.projectAllocationsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('allocations:update')
  @ApiBody({ type: UpdateProjectAllocationDto })
  @ApiOkResponse({ description: 'Update an allocation record.' })
  update(@Param('id') id: string, @Body() payload: UpdateProjectAllocationDto) {
    return this.projectAllocationsService.update(id, payload);
  }

  @Delete(':id')
  @RequirePermission('allocations:delete')
  @ApiOkResponse({ description: 'Delete an allocation record.' })
  remove(@Param('id') id: string) {
    return this.projectAllocationsService.remove(id);
  }
}

