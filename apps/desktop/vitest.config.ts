import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@v/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
