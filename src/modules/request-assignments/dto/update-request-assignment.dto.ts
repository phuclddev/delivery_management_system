import { PartialType } from '@nestjs/swagger';
import { CreateRequestAssignmentDto } from './create-request-assignment.dto';

export class UpdateRequestAssignmentDto extends PartialType(CreateRequestAssignmentDto) {}
