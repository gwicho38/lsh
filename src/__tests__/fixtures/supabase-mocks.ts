/**
 * Supabase Mock Utilities for Testing
 *
 * Provides mock Supabase client and factory functions for creating
 * test data that matches the database schema.
 *
 * @example
 * ```typescript
 * import { createMockSupabase, mockOrganization } from '../fixtures/supabase-mocks';
 *
 * const supabase = createMockSupabase({
 *   organizations: [mockOrganization({ name: 'Test Org' })],
 * });
 * ```
 */

import type {
  DbOrganizationRecord,
  DbUserRecord,
  DbTeamRecord,
  DbSecretRecord,
  DbOrganizationMemberRecord,
} from '../../lib/database-types.js';

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a mock organization record with sensible defaults.
 * Override any field by passing it in the partial.
 */
export function mockOrganization(
  overrides: Partial<DbOrganizationRecord> = {}
): DbOrganizationRecord {
  const now = new Date().toISOString();
  return {
    id: `org_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Organization',
    slug: 'test-org',
    stripe_customer_id: null,
    subscription_tier: 'free',
    subscription_status: 'active',
    subscription_expires_at: null,
    settings: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    ...overrides,
  };
}

/**
 * Create a mock user record with sensible defaults.
 */
export function mockUser(overrides: Partial<DbUserRecord> = {}): DbUserRecord {
  const now = new Date().toISOString();
  const id = `user_${Math.random().toString(36).substr(2, 9)}`;
  return {
    id,
    email: `${id}@example.com`,
    email_verified: true,
    email_verification_token: null,
    email_verification_expires_at: null,
    password_hash: '$2b$12$mockhashmockhashmockhashmockhash', // Not a real hash
    oauth_provider: null,
    oauth_provider_id: null,
    first_name: 'Test',
    last_name: 'User',
    avatar_url: null,
    last_login_at: now,
    last_login_ip: '127.0.0.1',
    created_at: now,
    updated_at: now,
    deleted_at: null,
    ...overrides,
  };
}

/**
 * Create a mock team record with sensible defaults.
 */
export function mockTeam(overrides: Partial<DbTeamRecord> = {}): DbTeamRecord {
  const now = new Date().toISOString();
  return {
    id: `team_${Math.random().toString(36).substr(2, 9)}`,
    organization_id: `org_${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test Team',
    slug: 'test-team',
    description: 'A test team',
    encryption_key_id: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    ...overrides,
  };
}

/**
 * Create a mock secret record with sensible defaults.
 */
export function mockSecret(overrides: Partial<DbSecretRecord> = {}): DbSecretRecord {
  const now = new Date().toISOString();
  return {
    id: `secret_${Math.random().toString(36).substr(2, 9)}`,
    team_id: `team_${Math.random().toString(36).substr(2, 9)}`,
    environment: 'development',
    key: 'TEST_SECRET',
    encrypted_value: 'encrypted_test_value',
    encryption_key_id: `key_${Math.random().toString(36).substr(2, 9)}`,
    description: 'A test secret',
    tags: '[]',
    last_rotated_at: null,
    rotation_interval_days: null,
    created_at: now,
    created_by: null,
    updated_at: now,
    updated_by: null,
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  };
}

/**
 * Create a mock organization member record.
 */
export function mockOrgMember(
  overrides: Partial<DbOrganizationMemberRecord> = {}
): DbOrganizationMemberRecord {
  const now = new Date().toISOString();
  return {
    id: `member_${Math.random().toString(36).substr(2, 9)}`,
    organization_id: `org_${Math.random().toString(36).substr(2, 9)}`,
    user_id: `user_${Math.random().toString(36).substr(2, 9)}`,
    role: 'member',
    invited_by: null,
    invited_at: now,
    accepted_at: now,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

// ============================================================================
// MOCK SUPABASE CLIENT
// ============================================================================

/**
 * Mock Supabase response wrapper.
 */
export interface MockSupabaseResponse<T> {
  data: T | null;
  error: { message: string; code: string } | null;
}

/**
 * Create a successful Supabase response.
 */
export function mockSuccess<T>(data: T): MockSupabaseResponse<T> {
  return { data, error: null };
}

/**
 * Create an error Supabase response.
 */
export function mockError(message: string, code = 'PGRST000'): MockSupabaseResponse<never> {
  return { data: null, error: { message, code } };
}

/**
 * Configuration for the mock Supabase client.
 */
export interface MockSupabaseConfig {
  organizations?: DbOrganizationRecord[];
  users?: DbUserRecord[];
  teams?: DbTeamRecord[];
  secrets?: DbSecretRecord[];
  members?: DbOrganizationMemberRecord[];
}

/**
 * Create a mock Supabase client for testing.
 *
 * Returns data from the provided config based on query parameters.
 * Supports basic filtering via .eq() and .single().
 *
 * @example
 * ```typescript
 * const mockClient = createMockSupabase({
 *   organizations: [mockOrganization({ id: 'org_123' })],
 * });
 *
 * // In test
 * jest.mock('../../lib/supabase-client', () => ({
 *   getSupabaseClient: () => mockClient,
 * }));
 * ```
 */
export function createMockSupabase(config: MockSupabaseConfig = {}) {
  const tables: Record<string, unknown[]> = {
    organizations: config.organizations || [],
    users: config.users || [],
    teams: config.teams || [],
    secrets: config.secrets || [],
    organization_members: config.members || [],
  };

  return {
    from: (tableName: string) => {
      const tableData = tables[tableName] || [];
      let filteredData = [...tableData];
      let isSingle = false;

      const queryBuilder = {
        select: (_columns?: string) => queryBuilder,
        insert: (data: unknown) => {
          if (Array.isArray(data)) {
            tableData.push(...data);
          } else {
            tableData.push(data);
          }
          filteredData = Array.isArray(data) ? data : [data];
          return queryBuilder;
        },
        update: (_data: unknown) => queryBuilder,
        delete: () => queryBuilder,
        eq: (column: string, value: unknown) => {
          filteredData = filteredData.filter(
            (row) => (row as Record<string, unknown>)[column] === value
          );
          return queryBuilder;
        },
        neq: (column: string, value: unknown) => {
          filteredData = filteredData.filter(
            (row) => (row as Record<string, unknown>)[column] !== value
          );
          return queryBuilder;
        },
        is: (column: string, value: unknown) => {
          filteredData = filteredData.filter(
            (row) => (row as Record<string, unknown>)[column] === value
          );
          return queryBuilder;
        },
        order: (_column: string, _options?: { ascending?: boolean }) => queryBuilder,
        limit: (count: number) => {
          filteredData = filteredData.slice(0, count);
          return queryBuilder;
        },
        single: () => {
          isSingle = true;
          return queryBuilder;
        },
        then: (resolve: (result: MockSupabaseResponse<unknown>) => void) => {
          if (isSingle) {
            if (filteredData.length === 0) {
              resolve(mockError('No rows found', 'PGRST116'));
            } else {
              resolve(mockSuccess(filteredData[0]));
            }
          } else {
            resolve(mockSuccess(filteredData));
          }
        },
      };

      return queryBuilder;
    },
  };
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

/**
 * Pre-built sample organization for quick testing.
 */
export const SAMPLE_ORG = mockOrganization({
  id: 'org_sample123',
  name: 'Sample Organization',
  slug: 'sample-org',
  subscription_tier: 'pro',
});

/**
 * Pre-built sample user for quick testing.
 */
export const SAMPLE_USER = mockUser({
  id: 'user_sample123',
  email: 'sample@example.com',
  first_name: 'Sample',
  last_name: 'User',
});

/**
 * Pre-built sample team for quick testing.
 */
export const SAMPLE_TEAM = mockTeam({
  id: 'team_sample123',
  organization_id: 'org_sample123',
  name: 'Sample Team',
  slug: 'sample-team',
});
