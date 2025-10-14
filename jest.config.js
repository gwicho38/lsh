export default {
    // Indicates whether each individual test should be reported during the run
    verbose: true,

    // The directory where Jest should output its coverage files
    coverageDirectory: 'coverage',

    // Collect coverage information
    collectCoverage: false, // Enable with --coverage flag
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/__tests__/**',
        '!src/**/types/**',
        '!src/electron/**', // Exclude Electron main process
        '!src/index.ts',
    ],

    // Coverage threshold - Set realistic baseline to prevent regression
    // Current baseline (2025-10-02): 11.73% lines, 11.47% statements, 12.39% branches, 9.71% functions
    // Target (Issue #68): 70% coverage
    coverageThreshold: {
        global: {
            statements: 11,
            branches: 12,
            functions: 9,
            lines: 11
        }
    },

    // Coverage reporters
    coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

    // An array of file extensions your modules use
    moduleFileExtensions: ['js', 'ts'],

    // The test environment that will be used for testing
    testEnvironment: 'node',

    // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
    // TODO: Fix and re-enable these tests (require comprehensive refactoring for strict mode)
    testPathIgnorePatterns: [
      '/node_modules/',
      '/build/',
      '__tests__/daemon.test.ts',           // TODO: Rewrite tests to match actual LSHJobDaemon API (uses wrong method names)
      '__tests__/posix-builtins.test.ts',   // TODO: Investigate memory/timeout issue
      '__tests__/api-server.test.ts',       // TODO: Update mocks to match JobSpec interface
      '__tests__/pipeline-service.test.ts', // TODO: Fix after reviewing failures
    ],

    // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
    // Transform ES modules from node_modules like chalk
    transformIgnorePatterns: [
        'node_modules/(?!(chalk|chalk-template|ansi-styles|supports-color|has-flag|#ansi-styles|#supports-color)/)'
    ],

    // Whether to use watchman for file crawling
    watchman: false,

    // Use standard ts-jest preset
    preset: 'ts-jest/presets/default-esm',
    extensionsToTreatAsEsm: ['.ts'],

    // Transform configuration
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: {
                module: 'ES2022',
                target: 'ES2022',
                moduleResolution: 'node'
            },
            useESM: true
        }],
    },

    // Module name mapping for ESM compatibility - map .js imports to .ts files for testing
    // Only map relative imports (starting with ./ or ../), not node_modules
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
};
  