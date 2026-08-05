import { hashPassword } from "@/lib/password";
import type { UserRow } from "@/types/database";

/**
 * Typed users fixtures. The seeded operator account has a REAL scrypt hash
 * (derived at load from the known test password), so integration/unit tests
 * can exercise the existing-user login path end to end. The bootstrap admin
 * is deliberately NOT seeded — it is provisioned by the auth service.
 */
export const users: UserRow[] = [
  {
    id: "user-1",
    email: "operator@ethioexchange.test",
    name: "Operator",
    role: "admin",
    password_hash: hashPassword("operator-password-123"),
    avatar_url: null,
    created_at: "2026-01-01T09:00:00.000Z",
    last_login_at: null,
  },
];
