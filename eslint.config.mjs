import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt(
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      'vue/multi-word-component-names': [
        'error',
        {
          ignores: [
            'index',
            'default',
            'app',
            'error',
            'Error',
            'accessibility',
            'privacy',
            'terms',
            'credits',
          ],
        },
      ],
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],
      // Prettier writes <input />; this rule would reject it
      'vue/html-self-closing': 'off',
    },
  },
  {
    // Plain JS cannot carry return-type annotations; only the exported checker is untyped
    files: ['scripts/check-build-warnings.mjs'],
    rules: { '@typescript-eslint/explicit-function-return-type': 'off' },
  }
);
