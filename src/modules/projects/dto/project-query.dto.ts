import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ProjectQueryDto {
  @ApiPropertyOptional({ example: 'planned' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'team_cuid_here' })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({ example: 'high' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ example: 'user_cuid_here' })
  @IsOptional()
  @IsString()
  pmOwnerId?: string;

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
    description:
      'Supported values: createdAt, updatedAt, plannedLiveDate, actualLiveDate, status, businessPriority, projectCode, name',
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
