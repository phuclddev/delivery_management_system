import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProjectAllocationDto {
  @ApiProperty({ example: 'user_cuid_here' })
  @IsString()
  memberId!: string;

  @ApiProperty({ example: 'project_cuid_here' })
  @IsString()
  projectId!: string;

  @ApiProperty({ example: 'backend_dev' })
  @IsString()
  @MaxLength(100)
  roleType!: string;

  @ApiProperty({ example: 50, description: 'Allocation percentage from 0 to 100.' })
  @IsInt()
  @Min(0)
  @Max(100)
  allocationPct!: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  plannedMd?: number;

  @ApiPropertyOptional({ example: 6.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualMd?: number;

  @ApiProperty({ example: '2026-04-15T00:00:00.000Z' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-04-30T00:00:00.000Z' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priorityWeight?: number;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ example: 'Main contributor during sprint 2.' })
  @IsOptional()
  @IsString()
  note?: string;
}

