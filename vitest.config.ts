import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => ({
  test: {
    globals: true,
    // Load .env / .env.local so integration tests can read FMP_API_KEY,
    // IOL_USERNAME, etc. without requiring them to be passed on the CLI.
    // Empty prefix '' loads ALL keys (not just VITE_-prefixed).
    env: loadEnv(mode, process.cwd(), ''),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}));
