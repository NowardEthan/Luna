import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/features/**'],
              importNames: ['*'],
              message: 'ui não deve importar features',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/features/**', '**/shell/**', '**/components/**', '**/agent/**'], message: 'ui: camada isolada' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/features/**', '**/shell/**', '**/components/**'], message: 'core: sem dependências de UI' },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['**/shell/**'], message: 'features não importam shell' }],
        },
      ],
    },
  },
  {
    files: ['src/agent/**/*.{ts,tsx}', 'src/core/**/*.{ts,tsx}'],
    ignores: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '../hooks/useConversations',
              message: 'Use ConversationStore / features/chat em vez de useConversations.',
            },
            {
              name: '../../hooks/useConversations',
              message: 'Use ConversationStore / features/chat em vez de useConversations.',
            },
          ],
          patterns: [
            {
              group: ['**/hooks/useConversations', '**/hooks/useConversations.ts'],
              message: 'agent/core não deve importar useConversations — use ConversationStore.',
            },
          ],
        },
      ],
    },
  },
])
