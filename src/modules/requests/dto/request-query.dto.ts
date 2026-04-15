import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RequestQueryDto {
  @ApiPropertyOptional({ example: 'new' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'team_cuid_here' })
  @IsOptional()
  @IsString()
  teamId?: string;

  @ApiPropertyOptional({ example: 'project_cuid_here' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ example: 'high' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ example: 'feature' })
  @IsOptional()
  @IsString()
  requestType?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @IsString()
  pageSize?: string;

  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Supported values: createdAt, desiredLiveDate, priority, status, title, requestCode',
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
