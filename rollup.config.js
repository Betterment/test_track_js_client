import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';

const customTSConfig = {
  tsconfig: false,
  include: ['src/*.ts', 'types'],
  noEmit: true,
  allowJs: true,
  target: 'es5',
  module: 'esnext',
  lib: ['dom', 'esnext'],
  importHelpers: true,
  rootDir: 'src',
  strict: true,
  pretty: true,
  noImplicitAny: true,
  strictNullChecks: true,
  strictFunctionTypes: true,
  strictPropertyInitialization: true,
  noImplicitThis: true,
  alwaysStrict: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  noImplicitReturns: true,
  noFallthroughCasesInSwitch: true,
  moduleResolution: 'node',
  baseUrl: './',
  paths: {
    '*': ['src/*', 'node_modules/*']
  },
  esModuleInterop: true
};

export default [
  {
    input: 'src/testTrack.ts',
    external: ['js-cookie', 'uuid/v4', 'base-64', 'blueimp-md5', 'axios'],
    output: {
      dir: 'dist',
      format: 'esm'
    },
    plugins: [
      typescript({ noEmitOnError: false }),
      commonjs(),
      babel({
        exclude: 'node_modules/**'
      })
    ]
  },
  {
    input: 'src/testTrack.ts',
    output: {
      file: 'dist/testTrack.bundle.js',
      name: 'TestTrack',
      format: 'umd'
    },
    plugins: [
      resolve({
        browser: true
      }),
      typescript(customTSConfig),
      commonjs(),
      terser(),
      babel({
        exclude: 'node_modules/**'
      })
    ]
  }
];
