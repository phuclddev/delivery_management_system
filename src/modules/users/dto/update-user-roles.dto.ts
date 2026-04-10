import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateUserRolesDto {
  @ApiProperty({
    type: [String],
    example: ['clxroleadmin123', 'clxrolepm123'],
    description: 'Role IDs that should be assigned to the user. This replaces the current role set.',
  })
  @IsArray()
  @IsString({ each: true })
  roleIds!: string[];
}
