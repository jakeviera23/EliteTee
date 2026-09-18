import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "supabase/functions/_shared/**/*.test.ts",
      "src/lib/**/*.test.ts",
      "mobile/lib/**/*.test.ts",
    ],
  },
});
