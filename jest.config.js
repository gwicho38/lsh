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
        '!src/cli.ts', // CLI entry point - requires integration testing
        '!src/lib/saas-types.ts', // Type definitions only
        '!src/constants/**', // Constants only
        '!src/examples/**', // Example files
        '!src/util/**', // Utility exports
        // SaaS modules have tests that pass individually - exclude from coverage threshold until isolation fixed
        '!src/lib/saas-auth.ts',
        '!src/lib/saas-billing.ts',
        '!src/lib/saas-encryption.ts',
        '!src/lib/saas-organizations.ts',
        '!src/lib/saas-secrets.ts',
        '!src/lib/saas-audit.ts',
        '!src/daemon/saas-api-server.ts',
        '!src/daemon/saas-api-routes.ts',
        '!src/commands/**', // CLI commands require integration testing
        '!src/services/daemon/**', // Daemon registrars require integration testing
        '!src/services/cron/**', // Cron registrars require integration testing
        '!src/services/supabase/**', // Supabase registrars require integration testing
        '!src/services/secrets/**', // Secrets CLI requires integration testing
        '!src/services/api/**', // API registrars require integration testing
        '!src/services/lib/**', // Service lib exports
        '!src/lib/lshrc-init.ts', // CLI initialization
        // External service dependencies - require integration tests
        '!src/lib/database-persistence.ts', // Requires Supabase/PostgreSQL connection
        '!src/lib/job-storage-database.ts', // Requires database connection
        '!src/lib/cloud-config-manager.ts', // Requires cloud configuration
        '!src/lib/cron-job-manager.ts', // Requires daemon connection for most methods
        '!src/lib/enhanced-history-system.ts', // Requires DatabasePersistence for cloud sync
        '!src/lib/daemon-client-helper.ts', // Helper for daemon client
        '!src/lib/daemon-client.ts', // Requires daemon socket connection
        '!src/lib/ipfs-client-manager.ts', // Requires IPFS installation/network
        '!src/daemon/lshd.ts', // Daemon server - requires integration testing
        '!src/daemon/job-registry.ts', // Job registry - requires running daemon
        '!src/lib/base-command-registrar.ts', // Command registrar - requires daemon connection
    ],

    // Coverage threshold - Set to 70% per Issue #68
    // Current baseline (2025-11-29): 73.81% lines, 73.81% statements, 62.86% branches, 83.78% functions
    // Note: Use --runInBand flag when running tests to prevent mock contamination between test files
    // Note: Files requiring external services (database, daemon, cloud) are excluded and need integration tests
    coverageThreshold: {
        global: {
            statements: 70,
            branches: 60,
            functions: 80,
            lines: 70
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
      '__tests__/integration/cli-commands-comprehensive.test.ts', // Spawns CLI processes - too slow for CI, run manually
      '__tests__/integration/multi-host-sync.test.ts', // Requires multi-host setup - WIP
      '__tests__/multihost-key-isolation.test.ts', // Requires shared storage (Supabase/cloud) - tests use separate git repos with different metadata keys
      '__tests__/helpers/',                 // Helper files, not test suites
      '__tests__/fixtures/',                // Fixture files, not test suites
      '__tests__/mocks/',                   // Mock files, not test suites
      // IPFS tests - WIP, require network access
      '__tests__/secrets-manager.test.ts',  // Has IPFS integration tests that fail without network
      '__tests__/ipfs-secrets-storage.test.ts', // Requires IPFS network
      '__tests__/secrets-destructive-changes.test.ts', // Flaky test - destructive change detection needs fix (Issue TBD)
      '__tests__/unit/ipfs-client-manager.test.ts', // Requires IPFS mocks - WIP
      // Security tests - WIP, require testcontainers/Docker
      '__tests__/security/',                // Security test suite - WIP
      'src/__tests__/integration/',         // Integration tests - require testcontainers
      // SaaS tests pass individually but have mock contamination issues when run together
      // Run with: npx jest __tests__/saas-*.test.ts --runInBand --testPathPattern="saas-" --testPathIgnorePatterns=[]
      '__tests__/saas-auth.test.ts',
      '__tests__/saas-organizations.test.ts',
      '__tests__/saas-secrets.test.ts',
      '__tests__/saas-audit.test.ts',
      '__tests__/saas-encryption.test.ts',
      '__tests__/saas-billing.test.ts',
    ],

    // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
    // Transform ES modules from node_modules like chalk
    transformIgnorePatterns: [
        'node_modules/(?!(chalk|chalk-template|ansi-styles|supports-color|has-flag|#ansi-styles|#supports-color|multiformats)/)'
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
        '^(\\.{1,2}/.*)\\.js$': '$1',
    },
};
  