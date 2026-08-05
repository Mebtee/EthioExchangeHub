import type { UserRow } from "@/types/database";
import type { AuthenticatedUser } from "@/types/auth";

/**
 * Maps a persisted `users` row to the public authenticated-user shape.
 *
 * Lives here (not in the service or middleware) so both the auth service and
 * the `requireAuth` middleware share ONE mapping — no drift between what
 * login returns and what guards attach to `req.user`.
 */
export function toAuthenticatedUser(user: UserRow): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatar_url,
  };
}
