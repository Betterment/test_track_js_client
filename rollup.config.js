import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

export default [
  {
    input: 'src/testTrack.js',
    external: ['jquery', 'jquery.cookie', 'uuid/v4', 'base-64', 'blueimp-md5'],
    output: {
      file: 'dist/testTrack.js',
      format: 'esm'
    },
    plugins: [
      commonjs(),
      babel({
        exclude: 'node_modules/**'
      })
    ]
  },
  {
    input: 'src/testTrack.js',
    external: ['jquery'],
    output: {
      file: 'dist/testTrack.bundle.js',
      name: 'TestTrack',
      format: 'umd',
      globals: {
        jquery: '$'
      }
    },
    plugins: [
      resolve({
        browser: true
      }),
      commonjs(),
      terser(),
      babel({
        exclude: 'node_modules/**'
      })
    ]
  }
];
