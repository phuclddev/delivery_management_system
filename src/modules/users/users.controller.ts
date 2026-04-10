import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermission('users:view')
  @ApiOkResponse({
    description: 'List users with their assigned roles.',
  })
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @RequirePermission('users:view')
  @ApiOkResponse({
    description: 'Get a single user and their assigned roles.',
  })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/roles')
  @RequirePermission('users:manage')
  @ApiBody({
    type: UpdateUserRolesDto,
  })
  @ApiOkResponse({
    description: 'Replace the roles assigned to a user.',
  })
  updateRoles(@Param('id') id: string, @Body() payload: UpdateUserRolesDto) {
    return this.usersService.updateRoles(id, payload);
  }
}
