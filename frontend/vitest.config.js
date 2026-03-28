import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // jsdom gives every test file a real DOM — required for Component, Router, Modal, Toast.
    environment: 'jsdom',
    // No globals — all vitest helpers (describe, it, expect, vi) are explicit imports.
    globals: false,
    coverage: {
      provider:  'v8',
      reporter:  ['text', 'lcov', 'html'],
      reportsDirectory: 'coverage',
      include:   ['js/**/*.js'],
      // Excluded from thresholds:
      //   js/charts, js/services   — third-party-adjacent, no unit surface area
      //   js/features, js/components, app.js — UI integration layer; covered by E2E tests
      //   js/framework/events, js/framework/ref, js/ui/templates — thin wrappers, integration only
      exclude: [
        'js/charts/**',
        'js/services/**',
        'js/features/**',
        'js/components/**',
        'js/app.js',
        'js/framework/events.js',
        'js/framework/ref.js',
        'js/ui/templates.js',
      ],
      thresholds: {
        branches:   70,
        functions:  75,
        lines:      75,
        statements: 75,
      },
    },
  },
});
