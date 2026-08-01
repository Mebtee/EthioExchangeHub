import { envSchema, type Env } from "@/config/env";

/**
 * Environment validation — the fail-fast gate.
 *
 * Runs the zod schema against process.env (already populated by `dotenv/config`
 * in index.ts). When a required variable is missing or invalid, the server
 * refuses to boot and prints exactly which keys are wrong, so developers
 * never have to decode a raw ZodError stack dump.
 */
export function validateEnv(input: Record<string, unknown> = process.env): Env {
  const result = envSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");

    process.stderr.write(
      [
        "[FATAL] Invalid environment configuration.",
        "The server will not start until these are fixed:",
        "",
        issues,
        "",
        "Copy backend/.env.example to backend/.env and fill in real values.",
        "",
      ].join("\n"),
    );

    process.exit(1);
  }

  return result.data;
}

/** Validated, immutable environment singleton. */
export const env: Env = validateEnv();

export type { Env };
