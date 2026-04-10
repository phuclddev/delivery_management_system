import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { GoogleIdentity } from './interfaces/google-identity.interface';

@Injectable()
export class GoogleTokenVerifierService {
  private readonly oauthClient: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    this.oauthClient = new OAuth2Client(this.configService.get<string>('app.googleClientId'));
  }

  async verifyIdToken(idToken: string): Promise<GoogleIdentity> {
    const clientId = this.configService.get<string>('app.googleClientId');
    let payload: TokenPayload | undefined;

    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken,
        audience: clientId,
      });

      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Invalid Google ID token.');
    }

    if (!payload) {
      throw new UnauthorizedException('Google token payload is missing.');
    }

    return this.toGoogleIdentity(payload);
  }

  private toGoogleIdentity(payload: TokenPayload): GoogleIdentity {
    if (!payload.sub || !payload.email || !payload.email_verified) {
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
