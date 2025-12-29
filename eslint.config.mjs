import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import jest from 'eslint-plugin-jest';
import tsParser from '@typescript-eslint/parser';
import tseslint from '@typescript-eslint/eslint-plugin'

export default defineConfig([
	{
		files: ['src/*.{js,ts}'],
		plugins: {
			js,
			jest,
			tseslint,
		},
		extends: [
			'js/recommended',
			'jest/recommended',
			'tseslint/recommended',
		],
		rules: {
			'no-prototype-builtins': 'off'
		},
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 2020,
				sourceType: 'module',
			},
			globals: {
				window: 'writable',
			}
		},
	}
]);
