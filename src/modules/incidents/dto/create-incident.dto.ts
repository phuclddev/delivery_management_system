import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateIncidentDto {
  @ApiProperty({ example: 'INC-001' })
  @IsString()
  @MaxLength(100)
  incidentCode!: string;

  @ApiProperty({ example: 'project_cuid_here' })
  @IsString()
  projectId!: string;

  @ApiProperty({ example: '2026-04-10T03:00:00.000Z' })
  @IsDateString()
  foundAt!: string;

  @ApiProperty({ example: 'high' })
  @IsString()
  @MaxLength(100)
  severity!: string;

  @ApiProperty({ example: 'backend' })
  @IsString()
  @MaxLength(100)
  domain!: string;

  @ApiProperty({ example: 'API timeouts impacted order creation.' })
  @IsString()
  impactDescription!: string;

  @ApiPropertyOptional({ example: 'Alice, Bob' })
  @IsOptional()
  @IsString()
  resolvers?: string;

  @ApiPropertyOptional({ example: 'A cache misconfiguration caused cascading retries.' })
  @IsOptional()
  @IsString()
  background?: string;

  @ApiPropertyOptional({ example: 'Rolled back config and flushed stale cache.' })
  @IsOptional()
  @IsString()
  solution?: string;

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsInt()
  @Min(0)
  processingMinutes?: number;

  @ApiPropertyOptional({ example: 'sev1' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tag?: string;

  @ApiProperty({ example: 'resolved' })
  @IsString()
  @MaxLength(100)
  status!: string;

  @ApiPropertyOptional({ example: 'user_cuid_here' })
  @IsOptional()
  @IsString()
  ownerMemberId?: string;
}

