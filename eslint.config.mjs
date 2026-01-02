import eslint from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist/**/*']),
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-prototype-builtins': 'off'
    }
  }
]);
