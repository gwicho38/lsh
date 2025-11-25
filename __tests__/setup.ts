/**
 * Jest setup file - runs before all tests
 * Configures test environment variables
 */

// Disable Storacha in tests to prevent timeouts from network operations
process.env.LSH_STORACHA_ENABLED = 'false';

// Disable other external services that might cause timeouts
process.env.LSH_API_ENABLED = 'false';
