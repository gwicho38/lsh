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
import type { DbOrganizationRecord, DbUserRecord, DbTeamRecord, DbSecretRecord, DbOrganizationMemberRecord } from '../../lib/database-types.js';
/**
 * Create a mock organization record with sensible defaults.
 * Override any field by passing it in the partial.
 */
export declare function mockOrganization(overrides?: Partial<DbOrganizationRecord>): DbOrganizationRecord;
/**
 * Create a mock user record with sensible defaults.
 */
export declare function mockUser(overrides?: Partial<DbUserRecord>): DbUserRecord;
/**
 * Create a mock team record with sensible defaults.
 */
export declare function mockTeam(overrides?: Partial<DbTeamRecord>): DbTeamRecord;
/**
 * Create a mock secret record with sensible defaults.
 */
export declare function mockSecret(overrides?: Partial<DbSecretRecord>): DbSecretRecord;
/**
 * Create a mock organization member record.
 */
export declare function mockOrgMember(overrides?: Partial<DbOrganizationMemberRecord>): DbOrganizationMemberRecord;
/**
 * Mock Supabase response wrapper.
 */
export interface MockSupabaseResponse<T> {
    data: T | null;
    error: {
        message: string;
        code: string;
    } | null;
}
/**
 * Create a successful Supabase response.
 */
export declare function mockSuccess<T>(data: T): MockSupabaseResponse<T>;
/**
 * Create an error Supabase response.
 */
export declare function mockError(message: string, code?: string): MockSupabaseResponse<never>;
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
export declare function createMockSupabase(config?: MockSupabaseConfig): {
    from: (tableName: string) => {
        select: (_columns?: string) => /*elided*/ any;
        insert: (data: unknown) => /*elided*/ any;
        update: (_data: unknown) => /*elided*/ any;
        delete: () => /*elided*/ any;
        eq: (column: string, value: unknown) => /*elided*/ any;
        neq: (column: string, value: unknown) => /*elided*/ any;
        is: (column: string, value: unknown) => /*elided*/ any;
        order: (_column: string, _options?: {
            ascending?: boolean;
        }) => /*elided*/ any;
        limit: (count: number) => /*elided*/ any;
        single: () => /*elided*/ any;
        then: (resolve: (result: MockSupabaseResponse<unknown>) => void) => void;
    };
};
/**
 * Pre-built sample organization for quick testing.
 */
export declare const SAMPLE_ORG: DbOrganizationRecord;
/**
 * Pre-built sample user for quick testing.
 */
export declare const SAMPLE_USER: DbUserRecord;
/**
 * Pre-built sample team for quick testing.
 */
export declare const SAMPLE_TEAM: DbTeamRecord;
