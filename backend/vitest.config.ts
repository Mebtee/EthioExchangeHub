import { resolve } from "node:path";

import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for the backend test suite (Phase 2I).
 *
 * - Node environment, no global test APIs (tests import from "vitest").
 * - `@/` path alias resolves to `src/`, matching the app's tsconfig.
 * - Coverage via v8 with the required minimum thresholds.
 * - `src/index.ts` / `src/server.ts` are process entry points that start a
 *   server and are therefore excluded from coverage.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup/env.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/server.ts", "src/types/**"],
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
  },
});
