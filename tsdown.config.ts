import { defineConfig } from 'tsdown';
import pkg from './package.json';

export default defineConfig([
  {
    format: 'esm',
    platform: 'neutral',
    entry: 'src/testTrack.ts',
    dts: true,
    sourcemap: true
  },
  {
    format: 'iife',
    platform: 'browser',
    entry: 'src/testTrack.ts',
    globalName: 'TestTrack',
    noExternal: Object.keys(pkg.dependencies)
  }
]);
