import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission('roles:view')
  @ApiOkResponse({
    description: 'List roles with their assigned permissions and users.',
  })
  findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  @RequirePermission('roles:create')
  @ApiBody({
    type: CreateRoleDto,
  })
  @ApiOkResponse({
    description: 'Create a role.',
  })
  create(@Body() payload: CreateRoleDto) {
    return this.rolesService.create(payload);
  }

  @Patch(':id')
  @RequirePermission('roles:update')
  @ApiBody({
    type: UpdateRoleDto,
  })
  @ApiOkResponse({
    description: 'Update a role.',
  })
  update(@Param('id') id: string, @Body() payload: UpdateRoleDto) {
    return this.rolesService.update(id, payload);
  }

  @Patch(':id/permissions')
  @RequirePermission('roles:manage')
  @ApiBody({
    type: UpdateRolePermissionsDto,
  })
  @ApiOkResponse({
    description: 'Replace the permissions assigned to a role.',
  })
  updatePermissions(
    @Param('id') id: string,
    @Body() payload: UpdateRolePermissionsDto,
  ) {
    return this.rolesService.updatePermissions(id, payload);
  }
}
