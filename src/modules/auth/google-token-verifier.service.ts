import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { GoogleIdentity } from './interfaces/google-identity.interface';

@Injectable()
export class GoogleTokenVerifierService {
  private readonly logger = new Logger(GoogleTokenVerifierService.name);
  private readonly oauthClient: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    this.oauthClient = new OAuth2Client(this.configService.get<string>('app.googleClientId'));
  }

  async verifyIdToken(idToken: string): Promise<GoogleIdentity> {
    const clientId = this.configService.get<string>('app.googleClientId');
    let payload: TokenPayload | undefined;

    if (!clientId) {
      this.logger.error('GOOGLE_CLIENT_ID is not configured on the backend.');
      throw new UnauthorizedException('Google authentication is not configured.');
    }

    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken,
        audience: clientId,
      });

      payload = ticket.getPayload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Google verification error';
      const normalizedMessage = message.toLowerCase();
      const isAudienceError =
        normalizedMessage.includes('audience') ||
        normalizedMessage.includes('wrong recipient') ||
        normalizedMessage.includes('token used too late') ||
        normalizedMessage.includes('issued to a different client');
      this.logger.warn(
        `Google token verification failed for audience ${clientId}: ${message}`,
      );
      throw new UnauthorizedException(
        isAudienceError
          ? 'Google token audience is invalid. Check GOOGLE_CLIENT_ID, VITE_GOOGLE_CLIENT_ID, and Google OAuth authorized origins.'
          : 'Google token is invalid or expired. Check GOOGLE_CLIENT_ID and frontend Google OAuth configuration.',
      );
    }

    if (!payload) {
      this.logger.warn('Google token payload was empty after verification.');
      throw new UnauthorizedException('Google token payload is missing.');
    }

    return this.toGoogleIdentity(payload);
  }

  private toGoogleIdentity(payload: TokenPayload): GoogleIdentity {
    if (!payload.sub || !payload.email || !payload.email_verified) {
      this.logger.warn(
        `Rejected Google payload because email verification details were incomplete for subject ${payload.sub ?? 'unknown'}.`,
      );
      throw new UnauthorizedException('Google account must have a verified email.');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      displayName: payload.name ?? payload.email,
      avatarUrl: payload.picture ?? null,
    };
  }
}
