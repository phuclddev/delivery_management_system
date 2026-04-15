import { PartialType } from '@nestjs/swagger';
import { CreateRequestAssignmentFeProfileDto } from './create-request-assignment-fe-profile.dto';

export class UpdateRequestAssignmentFeProfileDto extends PartialType(
  CreateRequestAssignmentFeProfileDto,
) {}
