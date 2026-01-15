import { defineConfig } from 'vitest/config';
import { testTrackPlugin } from './src/vite';

export default defineConfig({
  plugins: [testTrackPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    clearMocks: true,
    setupFiles: ['./src/setupTests.ts']
  }
});
