import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    watch: false,
    reporters: "verbose",
    hookTimeout: 15000,
    passWithNoTests: true
  }
});
