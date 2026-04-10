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
}

