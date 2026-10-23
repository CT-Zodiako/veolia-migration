import { defineConfig } from 'vitest/config';

// Component specs render PrimeNG tables in jsdom; under a loaded machine the 5 s Vitest default made
// them time out at random. A single generous timeout keeps the suite deterministic.
export default defineConfig({
  test: {
    testTimeout: 30000
  }
});
