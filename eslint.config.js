import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'playwright-report', 'test-results'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.strict],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Le domaine reste pur : ni React, ni Dexie, ni couche données (CLAUDE.md).
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', 'react/*'],
              message: 'Le domaine ne dépend pas de React.',
            },
            { group: ['dexie', 'dexie-*'], message: 'Le domaine ne dépend pas de Dexie.' },
            {
              group: ['**/db/**', '**/db', '**/features/**', '**/ui/**'],
              message: 'Le domaine ne dépend que de lui-même.',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Date', property: 'now', message: '`now` est passé en paramètre (section 5).' },
        {
          object: 'performance',
          property: 'now',
          message: '`now` est passé en paramètre (section 5).',
        },
      ],
    },
  },
  prettier,
);
