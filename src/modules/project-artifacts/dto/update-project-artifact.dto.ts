import { PartialType } from '@nestjs/swagger';
import { CreateProjectArtifactDto } from './create-project-artifact.dto';

export class UpdateProjectArtifactDto extends PartialType(CreateProjectArtifactDto) {}

