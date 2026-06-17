import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // The build-probe test runs `astro build`, which takes a few seconds.
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // Both build-probe suites (build.test.ts, homepage.test.ts) run `astro build` into the
    // SAME dist/ directory; running them in parallel races and clobbers the output. Force
    // file-level serialization so each suite owns dist/ for its run.
    fileParallelism: false,
  },
});
