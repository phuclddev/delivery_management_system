import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class MemberLeaveQueryDto {
  @ApiPropertyOptional({ example: 'user_cuid_here' })
  @IsOptional()
  @IsString()
  memberId?: string;

  @ApiPropertyOptional({ example: 'annual_leave' })
  @IsOptional()
  @IsString()
  leaveType?: string;

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
    example: 'startDate',
    description: 'Supported values: startDate, endDate, createdAt, updatedAt, leaveType',
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
