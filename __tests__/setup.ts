/**
 * Jest setup file - runs before all tests
 * Configures test environment variables
 */

// Disable external services that might cause timeouts
process.env.LSH_API_ENABLED = 'false';

// Disable IPFS sync in tests to prevent network operations
process.env.DISABLE_IPFS_SYNC = 'true';
