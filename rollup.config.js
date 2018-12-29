import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import resolve from 'rollup-plugin-node-resolve';
import { terser } from "rollup-plugin-terser";

export default [
  {
    input: 'src/testTrack.js',
    external: ['jquery', 'crypto'],
    output: {
      file: 'dist/testTrack.js',
      format: 'esm'
    },
    plugins: [
      resolve(),
      commonjs(),
      babel({
        exclude: 'node_modules/**'
      })
    ]
  },
  {
    input: 'src/testTrack.js',
    external: ['jquery', 'crypto'],
    output: {
      file: 'dist/testTrack.bundle.js',
      name: 'TestTrack',
      format: 'umd',
      globals: {
        jquery: '$',
        crypto: 'crypto'
      }
    },
    plugins: [
      resolve(),
      commonjs(),
      terser(),
      babel({
        exclude: 'node_modules/**'
      })
    ]
  }
];
