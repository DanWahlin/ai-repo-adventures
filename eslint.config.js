import js from '@eslint/js';
import cyclomaticComplexity from 'eslint-plugin-cyclomatic-complexity';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    plugins: {
      'cyclomatic-complexity': cyclomaticComplexity,
    },
    rules: {
      // Cyclomatic complexity rules
      'cyclomatic-complexity/zee-codeBlockComplexity': 'warn',
      
      // Standard ESLint rules that help with code simplicity
      'max-depth': ['warn', 4],
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-params': ['warn', 4],
      'max-statements': ['warn', 20],
      'complexity': ['warn', 10],
      
      // Disable some rules that might conflict with TypeScript
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '*.config.js',
      'tests/**', // Ignore test files from complexity checks
    ],
  },
];