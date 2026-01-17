import { defineConfig } from 'tsdown';
import pkg from './package.json';

export default defineConfig([
  {
    format: 'esm',
    platform: 'neutral',
    entry: 'src/index.ts',
    dts: true,
    sourcemap: true
  },
  {
    format: 'iife',
    minify: true,
    platform: 'browser',
    entry: 'src/index.ts',
    globalName: 'TestTrack',
    noExternal: Object.keys(pkg.dependencies)
  },
  {
    format: 'esm',
    platform: 'neutral',
    entry: { react: 'src/react/index.tsx' },
    dts: true,
    sourcemap: true
  },
  {
    format: 'esm',
    platform: 'neutral',
    entry: { vite: 'src/vite/index.ts' },
    dts: true,
    sourcemap: true
  }
]);
