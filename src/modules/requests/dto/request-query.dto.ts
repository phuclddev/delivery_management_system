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

  @ApiPropertyOptional({ example: 'high' })
  @IsOptional()
  @IsString()
  priority?: string;
}

