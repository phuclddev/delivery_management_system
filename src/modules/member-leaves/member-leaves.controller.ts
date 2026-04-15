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
import { CreateMemberLeaveDto } from './dto/create-member-leave.dto';
import { MemberLeaveQueryDto } from './dto/member-leave-query.dto';
import { UpdateMemberLeaveDto } from './dto/update-member-leave.dto';
import { MemberLeavesService } from './member-leaves.service';

@ApiTags('member-leaves')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('member-leaves')
export class MemberLeavesController {
  constructor(private readonly memberLeavesService: MemberLeavesService) {}

  @Post()
  @RequirePermission('leaves:create')
  @ApiBody({ type: CreateMemberLeaveDto })
  @ApiOkResponse({ description: 'Create a member leave record.' })
  create(@Body() payload: CreateMemberLeaveDto) {
    return this.memberLeavesService.create(payload);
  }

  @Get()
  @RequirePermission('leaves:view')
  @ApiQuery({ name: 'memberId', required: false })
  @ApiQuery({ name: 'leaveType', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @ApiOkResponse({ description: 'List member leave records.' })
  findAll(@Query() query: MemberLeaveQueryDto) {
    return this.memberLeavesService.findAll(query);
  }

  @Get(':id')
  @RequirePermission('leaves:view')
  @ApiOkResponse({ description: 'Get a single member leave record.' })
  findOne(@Param('id') id: string) {
    return this.memberLeavesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('leaves:update')
  @ApiBody({ type: UpdateMemberLeaveDto })
  @ApiOkResponse({ description: 'Update a member leave record.' })
  update(@Param('id') id: string, @Body() payload: UpdateMemberLeaveDto) {
    return this.memberLeavesService.update(id, payload);
  }

  @Delete(':id')
  @RequirePermission('leaves:delete')
  @ApiOkResponse({ description: 'Delete a member leave record.' })
  remove(@Param('id') id: string) {
    return this.memberLeavesService.remove(id);
  }
}
