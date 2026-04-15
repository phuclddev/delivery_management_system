import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';

class ConvertRequestBaseDto extends OmitType(CreateProjectDto, [
  'requestId',
  'requesterTeamId',
  'scopeType',
  'requestedLiveDate',
] as const) {}

export class ConvertRequestToProjectDto extends PartialType(ConvertRequestBaseDto) {
  @ApiPropertyOptional({
    example: 'project_cuid_here',
    description:
      'If provided, the request will be attached to this existing project instead of creating a new project.',
  })
  @IsOptional()
  @IsString()
  projectId?: string;
}
