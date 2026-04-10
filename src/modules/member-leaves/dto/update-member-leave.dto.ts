import { PartialType } from '@nestjs/swagger';
import { CreateMemberLeaveDto } from './create-member-leave.dto';

export class UpdateMemberLeaveDto extends PartialType(CreateMemberLeaveDto) {}

