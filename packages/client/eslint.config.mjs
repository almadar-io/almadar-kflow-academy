import almadar from '@almadar/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'build/**',
      'coverage/**',
      '**/*.stories.tsx',
      '**/*.stories.jsx',
      '**/*.test.tsx',
      '**/*.test.ts',
      '**/*.spec.tsx',
      '**/*.spec.ts',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      almadar,
    },
    rules: {
      'almadar/no-as-any': 'error',
      'almadar/no-unknown-type': 'error',
      'almadar/no-record-string-unknown': 'error',
      'almadar/no-use-navigate': 'error',
    },
  },
];
