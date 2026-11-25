import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/shared/**/*.test.ts", "apps/web/**/*.test.ts"],
    environment: "node",
    coverage: {
      reporter: ["text", "html"],
      include: ["packages/shared/src/**/*.ts"],
    },
  },
});
