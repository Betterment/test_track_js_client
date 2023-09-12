import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default [
  {
    input: 'src/testTrack.ts',
    external: ['js-cookie', 'uuid/v4', 'abab', 'blueimp-md5', 'axios'],
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
        browser: true,
      }),
      typescript({ noEmitOnError: false }),
      commonjs(),
      terser(),
      babel({
        exclude: 'node_modules/**'
      })
    ]
  },
];
