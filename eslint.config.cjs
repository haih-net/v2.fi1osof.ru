// @ts-check

const eslint = require('@eslint/js')
const tseslint = require('typescript-eslint')
const react = require('eslint-plugin-react')
const reactHooks = require('eslint-plugin-react-hooks')
const unusedImports = require('eslint-plugin-unused-imports')

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    ignores: [
      'docker/supabase/data',
      '**/generated/**',
      'node_modules/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'build/**',
      '.react-router/**',
      'storybook-static/**',
      'package-lock.json',
      'tsconfig.tsbuildinfo',
      'eslint.config.cjs',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
      'unused-imports': unusedImports,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-extra-semi': 'off',
      '@typescript-eslint/no-empty-function': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-deprecated': 'error',
      'no-prototype-builtins': 'off',
      'unused-imports/no-unused-imports': 'error',
      'react/no-unescaped-entities': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/jsx-no-bind': 'error',
      'react/no-array-index-key': 'error',
      'react/no-children-prop': 'off',
      'react/no-unknown-property': 'off',
      'react/jsx-uses-react': 'off',
      'no-fallthrough': 'error',
      'no-console': [
        'error',
        {
          allow: ['warn', 'error'],
        },
      ],
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/*.css', '*.css'],
              message:
                'Import a named Linaria styled component from styles.ts instead of a CSS side effect.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['app/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/*.css', '*.css'],
              message:
                'Import a named Linaria styled component from styles.ts instead of a CSS side effect.',
            },
            {
              group: ['**/pages/**'],
              message:
                'Shared components must not depend on pages. Pass page-specific data and assets through typed parameters.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: {
      parserOptions: {
        sourceType: 'commonjs',
        projectService: false,
      },
      globals: {
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-deprecated': 'off',
    },
  },
]
