import { Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';

@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  create() {
    return this.rolesService.create();
  }

  @Patch(':id')
  update(@Param('id') id: string) {
    return this.rolesService.update(id);
  }

  @Patch(':id/permissions')
  updatePermissions(@Param('id') id: string) {
    return this.rolesService.updatePermissions(id);
  }
}

