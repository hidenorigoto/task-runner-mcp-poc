import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/tests/**',
      ],
    },
    include: ['tests/**/*.test.ts'],
    reporters: ['verbose'],
    watchExclude: ['node_modules', 'dist', 'logs'],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
});