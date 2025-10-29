// ESLint configuration for SLURPSLOP Chrome Extension
import js from '@eslint/js';

export default [
  // Ignore build artifacts and vendor assets
  { ignores: ['dist/**', 'node_modules/**', 'icons/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        chrome: 'readonly',
        browser: 'readonly',
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        MutationObserver: 'readonly',
        NodeFilter: 'readonly',
        Event: 'readonly',
        performance: 'readonly',
        navigator: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': 'error',
      'curly': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      'no-multi-str': 'error',
      'no-new-wrappers': 'error',
      'no-array-constructor': 'error',
      'no-new-object': 'error',
      'space-before-function-paren': ['error', 'never'],
      'keyword-spacing': 'error',
      'space-infix-ops': 'error',
      'comma-spacing': 'error',
      'brace-style': ['error', '1tbs'],
      'indent': ['error', 2],
      'quotes': ['error', 'single', { allowTemplateLiterals: true }],
      'semi': ['error', 'always']
    }
  },
  {
    files: ['src/content/content-script.js', 'dist/content-script.js'],
    languageOptions: {
      globals: {
        // Additional globals for content scripts
        Node: 'readonly'
      }
    }
  },
  {
    // Allow ESM in the new bundling entry and module files
    files: ['src/content/index.js', 'src/content/modules/**/*.js'],
    languageOptions: {
      sourceType: 'module'
    }
  }
];