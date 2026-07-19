import type { Request } from 'express';

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: 'USER' | 'ADMIN';
  iat?: number;
  exp?: number;
}

export interface RequestWithUser extends Request {
  user: JwtPayload;
}
