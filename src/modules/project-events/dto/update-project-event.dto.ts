import { PartialType } from '@nestjs/swagger';
import { CreateProjectEventDto } from './create-project-event.dto';

export class UpdateProjectEventDto extends PartialType(CreateProjectEventDto) {}
