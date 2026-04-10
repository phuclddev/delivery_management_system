import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateProjectArtifactDto {
  @ApiProperty({ example: 'project_cuid_here' })
  @IsString()
  projectId!: string;

  @ApiProperty({ example: 'release_note' })
  @IsString()
  @MaxLength(100)
  artifactType!: string;

  @ApiProperty({ example: 'Sprint 10 Release Notes' })
  @IsString()
  @MaxLength(191)
  title!: string;

  @ApiPropertyOptional({ example: 'Released order batching and courier status sync.' })
  @IsOptional()
  @IsString()
  contentText?: string;

  @ApiPropertyOptional({ example: 'https://files.example.com/release-notes.pdf' })
  @ValidateIf((o: CreateProjectArtifactDto) => o.fileUrl !== undefined)
  @IsUrl()
  fileUrl?: string;

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;

  @ApiPropertyOptional({ example: 'user_cuid_here' })
  @IsOptional()
  @IsString()
  uploadedBy?: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isFinal?: boolean;
}

