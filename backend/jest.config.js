/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch:       ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',       // entry point — no testable logic
    '!src/db/migrate.js',   // thin wrapper around schema.sql execution
  ],
  coverageDirectory:  'coverage',
  coverageReporters:  ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: { branches: 70, functions: 75, lines: 75, statements: 75 },
  },
};
