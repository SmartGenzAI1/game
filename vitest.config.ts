import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '__tests__/',
        'coverage/',
        'dist/',
        'build/',
        '*.config.{js,ts}',
        'next.config.mjs',
        'postcss.config.js',
        'tailwind.config.js',
        'prisma/migrations/',
        'public/',
        '.next/',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
    include: ['**/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    exclude: [
      'node_modules/',
      'dist/',
      '.next/',
      'coverage/',
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
