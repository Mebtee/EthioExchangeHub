/// <reference types="vitest/config" />

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
  },
  build: {
    // Keep generated JS/CSS readable for debugging while remaining optimized.
    minify: "esbuild",
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Stable, cache-friendly chunk names for long-term caching.
        manualChunks(id) {
          // Match on the resolved package name rather than path substrings so
          // the split stays correct as dependencies evolve (e.g. @radix-ui/react-*).
          const match = id.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
          const pkg = match?.[1] ?? "";
          if (!pkg) return undefined;
          if (pkg.startsWith("@tanstack") || pkg === "axios") return "vendor-data";
          if (pkg === "recharts" || pkg.startsWith("d3-")) return "vendor-charts";
          if (pkg === "lucide-react") return "vendor-icons";
          if (
            pkg === "react" ||
            pkg === "react-dom" ||
            pkg.startsWith("react-router") ||
            pkg === "react-hook-form"
          ) {
            return "vendor-react";
          }
          return "vendor";
        },
      },
    },
  },
});
