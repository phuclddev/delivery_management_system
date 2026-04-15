import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PROJECT_EVENT_TYPES } from '../project-event.constants';

export class CreateProjectEventDto {
  @ApiProperty({ example: 'project_cuid_here' })
  @IsString()
  projectId!: string;

  @ApiPropertyOptional({ example: 'request_cuid_here' })
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiProperty({ enum: PROJECT_EVENT_TYPES, example: 'estimate_done' })
  @IsString()
  @IsIn(PROJECT_EVENT_TYPES)
  eventType!: string;

  @ApiProperty({ example: 'Estimation completed' })
  @IsString()
  @MaxLength(191)
  eventTitle!: string;

  @ApiPropertyOptional({ example: 'Backend and frontend estimates were aligned with PM.' })
  @IsOptional()
  @IsString()
  eventDescription?: string;

  @ApiProperty({ example: '2026-04-13T09:30:00.000Z' })
  @IsDateString()
  eventAt!: string;

  @ApiPropertyOptional({ example: 'user_cuid_here' })
  @IsOptional()
  @IsString()
  actorUserId?: string;

  @ApiPropertyOptional({ example: 'manual' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sourceType?: string;

  @ApiPropertyOptional({
    example: {
      oldScope: 'v1',
      newScope: 'v2',
      changedBy: 'pm@example.com',
    },
    description: 'Optional arbitrary JSON payload for event context.',
  })
  @IsOptional()
  @IsObject()
  metadataJson?: Record<string, unknown>;
}
