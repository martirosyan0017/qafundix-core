import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // index.ts and the type file only re-export or declare types; they hold no logic to test.
      exclude: ['src/index.ts', 'src/types/**'],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
      // Core is shared by every automation repository, so a regression here breaks all of them.
      // The suite is fast and service-free, so near-complete coverage is cheap to keep.
      // Branches get a little more room for defensive checks that are hard to reach on purpose.
      thresholds: { statements: 95, lines: 95, functions: 95, branches: 90 },
    },
  },
});
