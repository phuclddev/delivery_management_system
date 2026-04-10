import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PermissionsService } from './permissions.service';

@ApiTags('permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermission('permissions:view')
  @ApiOkResponse({
    description: 'List all permissions available in the system.',
  })
  findAll() {
    return this.permissionsService.findAll();
  }

  @Get(':id')
  @RequirePermission('permissions:view')
  @ApiOkResponse({
    description: 'Get a single permission.',
  })
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }
}
