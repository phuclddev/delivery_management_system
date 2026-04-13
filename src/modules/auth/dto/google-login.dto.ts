import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    example: 'google-id-token',
    required: false,
    description: 'Legacy Google ID token field. Prefer `credential` from Google Login.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  idToken?: string;

  @ApiProperty({
    example: 'google-id-token',
    required: false,
    description: 'Google credential returned by the frontend Google sign-in flow.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  credential?: string;
}
