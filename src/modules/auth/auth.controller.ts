import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from './decorators/current-user.decorator';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @ApiOkResponse({
    description: 'Authenticate with a Google ID token and receive a JWT access token.',
  })
  googleLogin(@Body() payload: GoogleLoginDto) {
    return this.authService.googleLogin(payload);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOkResponse({
    description: 'Return the currently authenticated user profile.',
  })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.userId);
  }
}
