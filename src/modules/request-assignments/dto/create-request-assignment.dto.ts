import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateRequestAssignmentDto {
  @ApiProperty({ example: 'request_cuid_here' })
  @IsString()
  requestId!: string;

  @ApiProperty({ example: 'project_cuid_here' })
  @IsString()
  projectId!: string;

  @ApiProperty({ example: 'user_cuid_here' })
  @IsString()
  memberId!: string;

  @ApiProperty({ example: 'frontend_dev' })
  @IsString()
  @MaxLength(100)
  roleType!: string;

  @ApiPropertyOptional({ example: 'frontend', description: 'Suggested values: frontend, backend, system' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  workType?: string;

  @ApiPropertyOptional({ example: 3, minimum: 1, maximum: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  uncertaintyLevel?: number;

  @ApiPropertyOptional({ example: 6.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedMd?: number;

  @ApiPropertyOptional({ example: 4.25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualMd?: number;

  @ApiPropertyOptional({ example: '2026-04-14T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-04-28T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'in_progress' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  status?: string;

  @ApiPropertyOptional({ example: 'Primary FE owner for the campaign request.' })
  @IsOptional()
  @IsString()
  note?: string;
}
