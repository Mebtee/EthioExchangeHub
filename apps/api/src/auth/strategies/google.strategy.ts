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
    super({
      clientID: configService.getOrThrow<string>('google.clientId'),
      clientSecret: configService.getOrThrow<string>('google.clientSecret'),
      callbackURL: configService.getOrThrow<string>('google.callbackUrl'),
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
