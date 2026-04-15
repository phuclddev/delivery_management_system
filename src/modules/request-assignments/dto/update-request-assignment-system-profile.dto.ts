import { PartialType } from '@nestjs/swagger';
import { CreateRequestAssignmentSystemProfileDto } from './create-request-assignment-system-profile.dto';

export class UpdateRequestAssignmentSystemProfileDto extends PartialType(
  CreateRequestAssignmentSystemProfileDto,
) {}
