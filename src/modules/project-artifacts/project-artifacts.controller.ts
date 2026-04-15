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
import { CreateProjectArtifactDto } from './dto/create-project-artifact.dto';
import { ProjectArtifactQueryDto } from './dto/project-artifact-query.dto';
import { UpdateProjectArtifactDto } from './dto/update-project-artifact.dto';
import { ProjectArtifactsService } from './project-artifacts.service';

@ApiTags('project-artifacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('project-artifacts')
export class ProjectArtifactsController {
  constructor(private readonly projectArtifactsService: ProjectArtifactsService) {}

  @Post()
  @RequirePermission('artifacts:create')
  @ApiBody({ type: CreateProjectArtifactDto })
  @ApiOkResponse({ description: 'Create a project artifact.' })
  create(@Body() payload: CreateProjectArtifactDto) {
    return this.projectArtifactsService.create(payload);
  }

  @Get()
  @RequirePermission('artifacts:view')
  @ApiQuery({ name: 'projectId', required: false })
  @ApiQuery({ name: 'uploadedBy', required: false })
  @ApiQuery({ name: 'artifactType', required: false })
  @ApiQuery({ name: 'isFinal', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @ApiOkResponse({ description: 'List project artifacts.' })
  findAll(@Query() query: ProjectArtifactQueryDto) {
    return this.projectArtifactsService.findAll(query);
  }

  @Get(':id')
  @RequirePermission('artifacts:view')
  @ApiOkResponse({ description: 'Get a single project artifact.' })
  findOne(@Param('id') id: string) {
    return this.projectArtifactsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('artifacts:update')
  @ApiBody({ type: UpdateProjectArtifactDto })
  @ApiOkResponse({ description: 'Update a project artifact.' })
  update(@Param('id') id: string, @Body() payload: UpdateProjectArtifactDto) {
    return this.projectArtifactsService.update(id, payload);
  }

  @Delete(':id')
  @RequirePermission('artifacts:delete')
  @ApiOkResponse({ description: 'Delete a project artifact.' })
  remove(@Param('id') id: string) {
    return this.projectArtifactsService.remove(id);
  }
}
