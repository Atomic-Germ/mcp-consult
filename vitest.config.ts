import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'test/**',
        '**/*.test.ts',
        '**/*.d.ts',
        'src/demo-client.ts',
        'src/types/js-yaml.d.ts',
      ],
      thresholds: {
        branches: 30,
        functions: 45,
        lines: 40,
        statements: 40,
      },
    },
  },
});
