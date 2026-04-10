import { Injectable } from '@nestjs/common';

@Injectable()
export class PermissionsService {
  findAll() {
    return {
      message: 'Permissions module scaffolded. Implementation will be added in a later step.',
    };
  }
}

