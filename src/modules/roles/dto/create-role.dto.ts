import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    example: 'qa_lead',
  })
  @IsString()
  @MaxLength(100)
  code!: string;

  @ApiProperty({
    example: 'QA Lead',
  })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    example: 'Can coordinate QA activities and approvals.',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;
}

