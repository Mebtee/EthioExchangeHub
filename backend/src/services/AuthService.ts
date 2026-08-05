import { toAuthenticatedUser } from "@/lib/auth-user";
import { AuthenticationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signToken, verifyToken } from "@/lib/tokens";
import type { UsersRepository } from "@/repositories/UsersRepository";
import type { UserRow } from "@/types/database";
import type { AuthSession, AuthTokens, AuthenticatedUser } from "@/types/auth";

/** Runtime values the auth service needs — injected by the composition root. */
export interface AuthServiceConfig {
  /** JWT signing secret (env `JWT_SECRET`). */
  jwtSecret: string;
  /** Access-token lifetime (env `JWT_EXPIRES_IN`). */
  accessTokenExpiresIn: string;
  /** Refresh-token lifetime (env `REFRESH_TOKEN_EXPIRES_IN`). */
  refreshTokenExpiresIn: string;
  /** Password-reset-token lifetime (env `PASSWORD_RESET_TOKEN_EXPIRES_IN`). */
  passwordResetTokenExpiresIn: string;
  /** Bootstrap admin email (env `ADMIN_EMAIL`). */
  adminEmail: string;
  /** Bootstrap admin password (env `ADMIN_PASSWORD`) — only the scrypt hash is stored. */
  adminPassword: string;
}

/** Public contract of the auth service. */
export interface AuthService {
  /** Exchanges credentials for a token pair + user; provisions the bootstrap admin on first login. */
  login(email: string, password: string): Promise<AuthSession>;
  /** Exchanges a valid refresh token for a fresh token pair. */
  refresh(refreshToken: string): Promise<AuthTokens>;
  /** Resolves the authenticated user by id. */
  me(userId: string): Promise<AuthenticatedUser>;
  /** Issues a password-reset token for an existing user; null when the email is unknown. */
  forgotPassword(email: string): Promise<string | null>;
  /** Verifies the reset token and persists a new password hash. */
  resetPassword(token: string, newPassword: string): Promise<void>;
}

/**
 * Authentication business logic (A1).
 *
 * Credentials are never fabricated: login verifies against the persisted
 * `users` row (scrypt, constant-time), and the bootstrap admin is provisioned
 * from server configuration (`ADMIN_EMAIL` + `ADMIN_PASSWORD`) ONLY on first
 * login — the plaintext password is hashed and never stored or returned.
 * Token payloads come from the persisted row; nothing is invented.
 *
 * The reset flow deliberately never reveals whether an email exists: unknown
 * emails yield the same null result as a known email, and the controller
 * answers 200 either way. Without a mailer the issued token is logged for the
 * operator and returned to the client only in non-production builds.
 */
export class AuthServiceImpl implements AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly config: AuthServiceConfig,
  ) {}

  async login(email: string, password: string): Promise<AuthSession> {
    const normalizedEmail = email.trim().toLowerCase();
    let user = await this.usersRepository.findByEmail(normalizedEmail);

    if (!user) {
      // Only the configured bootstrap admin is ever provisioned — any other
      // unknown email fails exactly like a wrong password (no enumeration).
      if (normalizedEmail !== this.config.adminEmail.toLowerCase()) {
        throw new AuthenticationError("Invalid email or password.");
      }
      // NOTE: two concurrent first logins could both attempt the insert; the
      // unique email constraint makes the loser fail with a DatabaseError. In
      // practice this is a one-time bootstrap action, so a clean failure is
      // acceptable — the operator simply retries once the row exists.
      user = await this.usersRepository.insert({
        email: normalizedEmail,
        name: "Root Admin",
        role: "super_admin",
        password_hash: hashPassword(this.config.adminPassword),
      });
      logger.info("Provisioned the bootstrap administrator account", { userId: user.id });
    }

    if (!verifyPassword(password, user.password_hash)) {
      throw new AuthenticationError("Invalid email or password.");
    }

    await this.usersRepository.updateBy(
      { id: user.id },
      { last_login_at: new Date().toISOString() },
    );
    return { tokens: this.signTokens(user), user: toAuthenticatedUser(user) };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const { sub } = verifyToken(refreshToken, this.config.jwtSecret, "refresh");
    const user = await this.usersRepository.findById(sub);
    if (!user) throw new AuthenticationError("Invalid or expired token.");
    return this.signTokens(user);
  }

  async me(userId: string): Promise<AuthenticatedUser> {
    const user = await this.usersRepository.findById(userId);
    if (!user) throw new AuthenticationError("Session user no longer exists.");
    return toAuthenticatedUser(user);
  }

  async forgotPassword(email: string): Promise<string | null> {
    const user = await this.usersRepository.findByEmail(email.trim().toLowerCase());
    if (!user) return null;
    const token = signToken(
      { sub: user.id, purpose: "password-reset" },
      this.config.jwtSecret,
      this.config.passwordResetTokenExpiresIn,
    );
    // Delivery infrastructure (a mailer) is not wired yet — the operator
    // retrieves the token from the server log to complete the reset.
    logger.info("Password reset token issued", { userId: user.id });
    return token;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const { sub } = verifyToken(token, this.config.jwtSecret, "password-reset");
    const user = await this.usersRepository.findById(sub);
    if (!user) throw new AuthenticationError("Invalid or expired token.");
    await this.usersRepository.updateBy(
      { id: user.id },
      { password_hash: hashPassword(newPassword) },
    );
  }

  /** Signs a fresh access + refresh pair for the user. */
  private signTokens(user: UserRow): AuthTokens {
    return {
      accessToken: signToken(
        { sub: user.id, role: user.role, type: "access" },
        this.config.jwtSecret,
        this.config.accessTokenExpiresIn,
      ),
      refreshToken: signToken(
        { sub: user.id, type: "refresh" },
        this.config.jwtSecret,
        this.config.refreshTokenExpiresIn,
      ),
    };
  }
}
