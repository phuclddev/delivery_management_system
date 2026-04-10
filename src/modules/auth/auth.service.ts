import { Injectable } from '@nestjs/common';
import { GoogleLoginDto } from './dto/google-login.dto';

@Injectable()
export class AuthService {
  googleLogin(payload: GoogleLoginDto) {
    return {
      message: 'Google auth is scaffolded but not implemented yet.',
      payload,
    };
  }

  me() {
    return {
      message: 'Current user lookup is scaffolded but not implemented yet.',
    };
  }
}

