import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto';

class ConvertRequestBaseDto extends OmitType(CreateProjectDto, [
  'requestId',
  'requesterTeamId',
  'scopeType',
  'requestedLiveDate',
] as const) {}

export class ConvertRequestToProjectDto extends PartialType(ConvertRequestBaseDto) {}
