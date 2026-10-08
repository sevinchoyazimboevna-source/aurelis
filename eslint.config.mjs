// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Use explicit parser/plugin imports rather than an undeclared umbrella package.
export default [
	{
		ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
	},
	{
		files: ['apps/**/*.ts'],
		languageOptions: {
			parser: tsParser,
			globals: {
				...globals.node,
				...globals.jest,
			},
			sourceType: 'commonjs',
			parserOptions: {
				project: './tsconfig.eslint.json',
				tsconfigRootDir: dirname(fileURLToPath(import.meta.url)),
			},
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
			...eslintPluginPrettierRecommended.plugins,
		},
		rules: {
			...eslint.configs.recommended.rules,
			...tsPlugin.configs['eslint-recommended'].overrides[0].rules,
			...tsPlugin.configs['recommended-type-checked'].rules,
			...eslintPluginPrettierRecommended.rules,
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-floating-promises': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'prettier/prettier': ['error', { endOfLine: 'auto' }],
		},
	},
];
