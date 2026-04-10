import { PartialType } from '@nestjs/swagger';
import { CreateProjectAllocationDto } from './create-project-allocation.dto';

export class UpdateProjectAllocationDto extends PartialType(CreateProjectAllocationDto) {}

