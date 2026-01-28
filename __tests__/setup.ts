/**
 * Jest setup file - runs before all tests
 * Configures test environment variables
 */

// Disable external services that might cause timeouts
process.env.LSH_API_ENABLED = 'false';

// Disable IPFS sync in tests to prevent network operations
process.env.DISABLE_IPFS_SYNC = 'true';

// Set mock Supabase values to prevent config errors during module loading
// Note: Actual Supabase calls should be mocked in individual test files
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key-for-jest';

// Set mock encryption key for SaaS tests (32 bytes = 64 hex chars)
// Note: This is only used during module initialization, actual encryption should be mocked
process.env.LSH_MASTER_KEY = process.env.LSH_MASTER_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
