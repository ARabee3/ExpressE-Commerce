import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    // Run test files sequentially to avoid DB conflicts
    fileParallelism: false,
    // Setup file that connects DB/Redis before tests
    setupFiles: ["./tests/setup.js"],
  },
});
