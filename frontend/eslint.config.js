import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';

export default [
  js.configs.recommended,
  {
    plugins: { import: importPlugin },
    rules: {
      // Catch missing or unresolved imports
      'import/no-unresolved': 'error',
      'import/no-duplicates': 'warn',

      // Catch common JS mistakes
      'no-unused-vars':    ['warn', { argsIgnorePattern: '^_' }],
      'no-undef':          'error',
      'no-console':        'warn',
    },
    settings: {
      'import/resolver': { node: { extensions: ['.js'] } },
    },
  },
];
