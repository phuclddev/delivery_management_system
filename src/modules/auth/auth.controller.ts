import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  googleLogin(@Body() payload: GoogleLoginDto) {
    return this.authService.googleLogin(payload);
  }

  @Get('me')
  me() {
    return this.authService.me();
  }
}

