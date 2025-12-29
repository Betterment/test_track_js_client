import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(eslint.configs.recommended, tseslint.configs.recommended, {
  files: ['src/**/*.ts'],
  rules: {
    'no-prototype-builtins': 'off'
  }
});
