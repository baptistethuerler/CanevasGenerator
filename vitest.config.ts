import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.test.js", "app/src/**/*.test.{ts,tsx}"],
  },
});
