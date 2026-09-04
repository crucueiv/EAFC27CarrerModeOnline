import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/__tests__/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/competitions/**",
        "src/lib/coefficients/**",
        "src/lib/league-formats/**",
      ],
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
