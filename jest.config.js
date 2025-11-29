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
    // Current baseline (2025-11-29): 30.88% lines, 30.93% statements, 32.95% branches, 30.42% functions
    // Previous baseline (2025-10-02): 11.73% lines, 11.47% statements, 12.39% branches, 9.71% functions
    // Target (Issue #68): 70% coverage
    // Note: Use --runInBand flag when running tests to prevent mock contamination between test files
    coverageThreshold: {
        global: {
            statements: 30,
            branches: 32,
            functions: 30,
            lines: 30
        }
    },

    // Coverage reporters
    coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

    // An array of file extensions your modules use
    moduleFileExtensions: ['js', 'ts'],

    // The test environment that will be used for testing
    testEnvironment: 'node',

    // Reset mocks and modules between tests to prevent contamination
    resetMocks: true,
    clearMocks: true,
    restoreMocks: true,

    // Setup files to run before tests
    setupFiles: ['<rootDir>/__tests__/setup.ts'],

    // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
    testPathIgnorePatterns: [
      '/node_modules/',
      '/build/',
      '__tests__/setup.ts',                 // Setup file, not a test suite
      '__tests__/integration/storacha-multihost-sync.test.ts', // Requires Storacha network access (disabled in tests)
      '__tests__/multihost-key-isolation.test.ts', // Requires shared storage (Supabase/cloud) - tests use separate git repos with different metadata keys
      '__tests__/helpers/',                 // Helper files, not test suites
      '__tests__/fixtures/',                // Fixture files, not test suites
      '__tests__/mocks/',                   // Mock files, not test suites
    ],

    // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
    // Transform ES modules from node_modules like chalk and storacha
    transformIgnorePatterns: [
        'node_modules/(?!(chalk|chalk-template|ansi-styles|supports-color|has-flag|#ansi-styles|#supports-color|@storacha|@ucanto|@ipld|multiformats|@web3-storage)/)'
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
                moduleResolution: 'node',
                rootDir: undefined,  // Allow test files outside src/
                rootDirs: ['.', 'src', '__tests__']  // Allow imports from test directories
            },
            useESM: true,
            isolatedModules: true  // Skip type checking for faster tests
        }],
    },

    // Module name mapping for ESM compatibility - map .js imports to .ts files for testing
    // Only map relative imports (starting with ./ or ../), not node_modules
    moduleNameMapper: {
        // Mock storacha-client to avoid ESM issues in tests (must be before .js$ mapper)
        '.*/storacha-client(\\.js)?$': '<rootDir>/__tests__/mocks/storacha-client-mock.ts',
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
};
  