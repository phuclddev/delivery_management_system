import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'PRJ-001' })
  @IsString()
  @MaxLength(100)
  projectCode!: string;

  @ApiPropertyOptional({
    example: 'request_cuid_here',
    description:
      'Compatibility input alias. If provided, the backend will attach this request to the project via requests.project_id.',
  })
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiProperty({ example: 'Delivery Dashboard Revamp' })
  @IsString()
  @MaxLength(191)
  name!: string;

  @ApiProperty({ example: 'team_cuid_here' })
  @IsString()
  requesterTeamId!: string;

  @ApiPropertyOptional({ example: 'user_cuid_here' })
  @IsOptional()
  @IsString()
  pmOwnerId?: string;

  @ApiProperty({ example: 'feature' })
  @IsString()
  @MaxLength(100)
  projectType!: string;

  @ApiProperty({ example: 'full' })
  @IsString()
  @MaxLength(100)
  scopeType!: string;

  @ApiProperty({ example: 'planned' })
  @IsString()
  @MaxLength(100)
  status!: string;

  @ApiProperty({ example: 'high' })
  @IsString()
  @MaxLength(100)
  businessPriority!: string;

  @ApiPropertyOptional({ example: 'medium' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  riskLevel?: string;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  requestedLiveDate?: string;

  @ApiPropertyOptional({ example: '2026-04-12T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  plannedStartDate?: string;

  @ApiPropertyOptional({ example: '2026-05-20T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  plannedLiveDate?: string;

  @ApiPropertyOptional({ example: '2026-04-14T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  actualStartDate?: string;

  @ApiPropertyOptional({ example: '2026-05-25T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  actualLiveDate?: string;

  @ApiPropertyOptional({ example: '2026-04-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  backendStartDate?: string;

  @ApiPropertyOptional({ example: '2026-04-30T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  backendEndDate?: string;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  frontendStartDate?: string;

  @ApiPropertyOptional({ example: '2026-05-15T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  frontendEndDate?: string;

  @ApiPropertyOptional({ example: 'v1.2' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  currentScopeVersion?: string;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  scopeChangeCount?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  blockerCount?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  incidentCount?: number;

  @ApiPropertyOptional({ example: 'https://chat.example.com/group/1' })
  @IsOptional()
  @IsUrl()
  chatGroupUrl?: string;

  @ApiPropertyOptional({ example: 'https://github.com/org/repo' })
  @IsOptional()
  @IsUrl()
  repoUrl?: string;

  @ApiPropertyOptional({ example: 'Keep milestone 1 narrow.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
