import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRequestDto {
  @ApiProperty({ example: 'REQ-001' })
  @IsString()
  @MaxLength(100)
  requestCode!: string;

  @ApiProperty({ example: 'Improve delivery dashboard' })
  @IsString()
  @MaxLength(191)
  title!: string;

  @ApiProperty({ example: 'team_cuid_here' })
  @IsString()
  requesterTeamId!: string;

  @ApiPropertyOptional({ example: 'Q3 Growth Push' })
  @IsOptional()
  @IsString()
  @MaxLength(191)
  campaignName?: string;

  @ApiProperty({ example: 'feature' })
  @IsString()
  @MaxLength(100)
  requestType!: string;

  @ApiProperty({ example: 'full' })
  @IsString()
  @MaxLength(100)
  scopeType!: string;

  @ApiProperty({ example: 'high' })
  @IsString()
  @MaxLength(100)
  priority!: string;

  @ApiPropertyOptional({ example: '2026-05-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  desiredLiveDate?: string;

  @ApiPropertyOptional({ example: 'Need visibility into team throughput.' })
  @IsOptional()
  @IsString()
  brief?: string;

  @ApiProperty({ example: 'new' })
  @IsString()
  @MaxLength(100)
  status!: string;

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

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsInt()
  @Min(0)
  businessValueScore?: number;

  @ApiPropertyOptional({ example: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  userImpactScore?: number;

  @ApiPropertyOptional({ example: 9 })
  @IsOptional()
  @IsInt()
  @Min(0)
  urgencyScore?: number;

  @ApiPropertyOptional({ example: 'Expected to reduce reporting time by 50%.' })
  @IsOptional()
  @IsString()
  valueNote?: string;

  @ApiPropertyOptional({ example: 'Stakeholders approved initial scope.' })
  @IsOptional()
  @IsString()
  comment?: string;
}
