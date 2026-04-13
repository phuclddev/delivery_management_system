import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  handleRequest<TUser = unknown>(err: unknown, user: TUser, info: unknown): TUser {
    if (err) {
      const message = err instanceof Error ? err.message : 'Unknown JWT authentication error';
      this.logger.warn(`JWT authentication failed: ${message}`);
      throw err;
    }

    if (!user) {
      const infoMessage =
        info instanceof Error
          ? info.message
          : typeof info === 'string'
            ? info
            : 'Missing authenticated user from JWT strategy.';
      this.logger.warn(`JWT authentication rejected: ${infoMessage}`);
      throw new UnauthorizedException(infoMessage);
    }

    return user;
  }
}
