export default {
    // Indicates whether each individual test should be reported during the run
    verbose: true,

    // The directory where Jest should output its coverage files
    coverageDirectory: 'coverage',

    // An array of file extensions your modules use
    moduleFileExtensions: ['js', 'ts'],

    // The test environment that will be used for testing
    testEnvironment: 'node',

    // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
    testPathIgnorePatterns: ['/node_modules/', '/build/', '__tests__/daemon.test.ts', '__tests__/api-server.test.ts'],

    // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
    transformIgnorePatterns: ['<rootDir>/node_modules/'],

    // Whether to use watchman for file crawling
    watchman: false,

    // Use standard ts-jest preset
    preset: 'ts-jest',

    // Transform configuration
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            tsconfig: {
                module: 'ES2022',
                target: 'ES2022',
                moduleResolution: 'node'
            }
        }],
    },

    // Module name mapping for ESM compatibility - map .js imports to .ts files for testing
    moduleNameMapper: {
        '^(\\.{1,2}/.+)\\.js$': '$1.ts',
    },
};
  