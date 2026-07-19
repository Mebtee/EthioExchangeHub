import { Injectable, type NestMiddleware, ForbiddenException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly secret: string;

  constructor() {
    this.secret = process.env['CSRF_SECRET'] ?? crypto.randomBytes(32).toString('hex');
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Generate CSRF token for the response on every request
    const csrfToken = this.generateToken();
    res.setHeader('X-CSRF-Token', csrfToken);

    // Skip CSRF validation for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      next();
      return;
    }

    // For state-changing methods (POST, PUT, PATCH, DELETE), validate token
    const requestToken = req.headers['x-csrf-token'] as string;

    if (!requestToken) {
      throw new ForbiddenException('Missing CSRF token');
    }

    // Validate the token structure: version.random.hmac
    const parts = requestToken.split('.');
    if (parts.length !== 3 || parts[0] !== '1') {
      throw new ForbiddenException('Invalid CSRF token format');
    }

    // Verify HMAC
    const expectedHmac = crypto
      .createHmac('sha256', this.secret)
      .update(parts[1]!)
      .digest('hex');

    if (parts[2] !== expectedHmac) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    next();
  }

  private generateToken(): string {
    const random = crypto.randomBytes(32).toString('hex');
    const hmac = crypto.createHmac('sha256', this.secret).update(random).digest('hex');
    return `1.${random}.${hmac}`;
  }  

  /**
   * Get the current secret (for testing/debugging).
   */
  getSecret(): string {
    return this.secret;
  }
}
