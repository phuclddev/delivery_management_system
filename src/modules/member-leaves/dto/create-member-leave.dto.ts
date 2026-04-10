import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMemberLeaveDto {
  @ApiProperty({ example: 'user_cuid_here' })
  @IsString()
  memberId!: string;

  @ApiProperty({ example: 'annual_leave' })
  @IsString()
  @MaxLength(100)
  leaveType!: string;

  @ApiProperty({ example: '2026-04-20T00:00:00.000Z' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-04-22T00:00:00.000Z' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ example: 'Family event.' })
  @IsOptional()
  @IsString()
  note?: string;
}
