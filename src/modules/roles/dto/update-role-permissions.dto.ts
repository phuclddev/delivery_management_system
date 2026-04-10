import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    type: [String],
    example: ['clxpermission123', 'clxpermission456'],
    description:
      'Permission IDs that should be assigned to the role. This replaces the current permission set.',
  })
  @IsArray()
  @IsString({ each: true })
  permissionIds!: string[];
}
