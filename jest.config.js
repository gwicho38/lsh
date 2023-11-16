export default {
    // Indicates whether each individual test should be reported during the run
    verbose: true,
  
    // The root directory that Jest should scan for tests and modules within
    rootDir: './src',
  
    // An array of glob patterns indicating a set of files for which coverage information should be collected
    collectCoverageFrom: ['**/*.{js,jsx,ts,tsx}', '!**/node_modules/**'],
  
    // The directory where Jest should output its coverage files
    coverageDirectory: 'coverage',
  
    // An array of file extensions your modules use
    moduleFileExtensions: ['js'],
  
    // The paths to modules that run some code to configure or set up the testing environment before each test
    setupFiles: [],
  
    // A list of paths to modules that run some code to configure or set up the testing framework before each test
    setupFilesAfterEnv: [],
  
    // A list of paths to snapshot serializer modules Jest should use for snapshot testing
    snapshotSerializers: [],
  
    // The test environment that will be used for testing
    testEnvironment: 'node',
  
    // The glob patterns Jest uses to detect test files
    testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)', '<rootDir>/test/**/*.[jt]s?(x)'],
  
    // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
    testPathIgnorePatterns: ['/node_modules/', '/build/'],
  
    // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
    transformIgnorePatterns: ['<rootDir>/node_modules/'],
  
    // Indicates whether each individual test should be reported during the run
    verbose: true,
  
    // Whether to use watchman for file crawling
    watchman: false,

    // Add transform property to transpile ES6+ to CommonJS
    transform: {
        '^.+\\.jsx?$': 'babel-jest',
    },
  };
  