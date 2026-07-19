import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';

export interface GoogleProfile {
  email: string;
  fullName: string;
  avatarUrl: string | null;
  googleId: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    const clientID = configService.get<string>('google.clientId', '');
    const clientSecret = configService.get<string>('google.clientSecret', '');
    const callbackURL = configService.get<string>('google.callbackUrl', '');

    // If Google OAuth is not configured, provide defaults that won't crash on startup
    // The route will fail gracefully when used without proper credentials
    super({
      clientID: clientID || 'unconfigured',
      clientSecret: clientSecret || 'unconfigured',
      callbackURL: callbackURL || 'http://localhost:4000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      emails?: { value: string }[];
      name?: { givenName?: string; familyName?: string };
      photos?: { value: string }[];
      id: string;
    },
  ): Promise<GoogleProfile> {
    const { emails, name, photos, id } = profile;

    return {
      email: emails?.[0]?.value ?? '',
      fullName: [name?.givenName, name?.familyName].filter(Boolean).join(' ') || 'Google User',
      avatarUrl: photos?.[0]?.value ?? null,
      googleId: id,
    };
  }
}
