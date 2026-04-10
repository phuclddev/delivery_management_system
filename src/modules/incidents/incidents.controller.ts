import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { IncidentsService } from './incidents.service';

@ApiTags('incidents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('incidents')
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Post()
  @RequirePermission('incidents:create')
  @ApiBody({ type: CreateIncidentDto })
  @ApiOkResponse({ description: 'Create an incident.' })
  create(@Body() payload: CreateIncidentDto) {
    return this.incidentsService.create(payload);
  }

  @Get()
  @RequirePermission('incidents:view')
  @ApiOkResponse({ description: 'List incidents.' })
  findAll() {
    return this.incidentsService.findAll();
  }

  @Get(':id')
  @RequirePermission('incidents:view')
  @ApiOkResponse({ description: 'Get a single incident.' })
  findOne(@Param('id') id: string) {
    return this.incidentsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('incidents:update')
  @ApiBody({ type: UpdateIncidentDto })
  @ApiOkResponse({ description: 'Update an incident.' })
  update(@Param('id') id: string, @Body() payload: UpdateIncidentDto) {
    return this.incidentsService.update(id, payload);
  }

  @Delete(':id')
  @RequirePermission('incidents:delete')
  @ApiOkResponse({ description: 'Delete an incident.' })
  remove(@Param('id') id: string) {
    return this.incidentsService.remove(id);
  }
}

