import type { Plugin } from 'vite';

/**
 * This plugin defines the following environment variables, which can be used to configure Test Track:
 *
 * - `import.meta.env.TT_APP_VERSION`
 * - `import.meta.env.TT_BUILD_TIMESTAMP`
 */
export function testTrackPlugin(): Plugin {
  return {
    name: '@betterment-oss/test-track/vite',
    enforce: 'pre',
    config() {
      const now = new Date();
      const version = `0.0.${Math.floor(now.getTime() / 1000)}`;
      const timestamp = now.toISOString().replace(/\.\d{3}Z$/, 'Z');

      return {
        define: {
          'import.meta.env.TT_APP_VERSION': JSON.stringify(version),
          'import.meta.env.TT_BUILD_TIMESTAMP': JSON.stringify(timestamp)
        }
      };
    }
  };
}
