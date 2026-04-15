import { PartialType } from '@nestjs/swagger';
import { CreateRequestAssignmentBeProfileDto } from './create-request-assignment-be-profile.dto';

export class UpdateRequestAssignmentBeProfileDto extends PartialType(
  CreateRequestAssignmentBeProfileDto,
) {}
