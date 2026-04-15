import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateRequestAssignmentFeProfileDto {
  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  screensViews?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(0)
  layoutComplexity?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  componentReuse?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  responsive?: boolean;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  animationLevel?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsInt()
  @Min(0)
  userActions?: number;

  @ApiPropertyOptional({ example: 'approve, reject, export, filter, assign' })
  @IsOptional()
  @IsString()
  userActionsList?: string;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  apiComplexity?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(0)
  clientSideLogic?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  heavyAssets?: boolean;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  uiClarity?: number;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @IsInt()
  @Min(0)
  specChangeRisk?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  deviceSupport?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  timelinePressure?: number;

  @ApiPropertyOptional({ example: 'Complex page flow with reusable widgets and moderate responsive constraints.' })
  @IsOptional()
  @IsString()
  note?: string;
}
