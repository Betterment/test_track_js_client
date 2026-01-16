import type { Plugin } from 'vite';

/**
 * This plugin defines `import.meta.env.TT_BUILD_TIMESTAMP`, which can be used to configure Test Track.
 */
export function testTrackPlugin(): Plugin {
  return {
    name: '@betterment-oss/test-track/vite',
    enforce: 'pre',
    config() {
      const now = new Date();
      const timestamp = now.toISOString().replace(/\.\d{3}Z$/, 'Z');

      return {
        define: {
          'import.meta.env.TT_BUILD_TIMESTAMP': JSON.stringify(timestamp)
        }
      };
    }
  };
}
