import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class RequestAssignmentQueryDto {
  @ApiPropertyOptional({ example: 'request_cuid_here' })
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiPropertyOptional({ example: 'project_cuid_here' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ example: 'user_cuid_here' })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiPropertyOptional({ example: 'frontend_dev' })
  @IsOptional()
  @IsString()
  roleType?: string;

  @ApiPropertyOptional({ example: 'system' })
  @IsOptional()
  @IsString()
  workType?: string;

  @ApiPropertyOptional({ example: '3' })
  @IsOptional()
  @IsString()
  uncertaintyLevel?: string;

  @ApiPropertyOptional({ example: 'in_progress' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: '2026-04-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-04-30T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '20' })
  @IsOptional()
  @IsString()
  pageSize?: string;

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Supported values: createdAt, updatedAt, roleType, status, startDate, endDate',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Supported values: asc, desc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: string;
}
