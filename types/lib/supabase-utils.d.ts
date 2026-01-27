/**
 * LSH Supabase Utilities
 *
 * Provides utility functions for common Supabase database operations.
 * Reduces code duplication and ensures consistent error handling across services.
 *
 * Key Features:
 * - Standardized error handling for Supabase queries
 * - Type-safe query builders with soft-delete support
 * - Consistent pagination and filtering patterns
 * - Integration with LSHError for structured error reporting
 *
 * @example
 * ```typescript
 * import { executeQuery, executeSingleQuery, buildFilteredQuery } from './supabase-utils.js';
 *
 * // Single record fetch with error handling
 * const org = await executeSingleQuery(
 *   supabase.from('organizations').select('*').eq('id', id),
 *   'Organization',
 *   { notFoundError: true }
 * );
 *
 * // Multiple records with soft-delete filter
 * const members = await executeQuery(
 *   buildFilteredQuery(supabase.from('members').select('*'), { softDelete: true })
 * );
 * ```
 *
 * @module supabase-utils
 */
import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { LSHError, ErrorCodes } from './lsh-error.js';
type AnyFilterBuilder = {
    is: (...args: any[]) => any;
    eq: (...args: any[]) => any;
    order: (...args: any[]) => any;
    limit: (...args: any[]) => any;
    range: (...args: any[]) => any;
};
/**
 * Options for query execution.
 */
export interface QueryOptions {
    /** Context string for error messages (e.g., 'Organization', 'Team member') */
    context?: string;
    /** Throw LSHError on database errors */
    throwOnError?: boolean;
    /** Include soft-deleted records (default: false) */
    includeSoftDeleted?: boolean;
}
/**
 * Options for single record queries.
 */
export interface SingleQueryOptions extends QueryOptions {
    /** Throw LSHError if record not found */
    notFoundError?: boolean;
}
/**
 * Options for filtered queries.
 */
export interface FilterOptions {
    /** Exclude soft-deleted records */
    softDelete?: boolean;
    /** Organization ID filter */
    organizationId?: string;
    /** Team ID filter */
    teamId?: string;
    /** User ID filter */
    userId?: string;
    /** Pagination limit */
    limit?: number;
    /** Pagination offset */
    offset?: number;
    /** Order by field */
    orderBy?: string;
    /** Order direction */
    orderDirection?: 'asc' | 'desc';
}
/**
 * Result of a database operation with metadata.
 */
export interface DbResult<T> {
    /** The data returned from the query */
    data: T | null;
    /** Error if the query failed */
    error?: string;
    /** Whether the operation was successful */
    success: boolean;
    /** Number of rows affected (for mutations) */
    count?: number;
}
/**
 * Execute a Supabase query and handle errors consistently.
 *
 * @example
 * ```typescript
 * const members = await executeQuery(
 *   supabase.from('organization_members').select('*').eq('org_id', orgId),
 *   { context: 'Organization members' }
 * );
 * ```
 */
export declare function executeQuery<T>(query: PromiseLike<PostgrestSingleResponse<T[]>>, options?: QueryOptions): Promise<T[]>;
/**
 * Execute a Supabase query expecting a single result.
 *
 * @example
 * ```typescript
 * const org = await executeSingleQuery(
 *   supabase.from('organizations').select('*').eq('id', id).single(),
 *   { context: 'Organization', notFoundError: true }
 * );
 * ```
 */
export declare function executeSingleQuery<T>(query: PromiseLike<PostgrestSingleResponse<T>>, options?: SingleQueryOptions): Promise<T | null>;
/**
 * Execute a Supabase insert operation.
 *
 * @example
 * ```typescript
 * const newOrg = await executeInsert(
 *   supabase.from('organizations').insert({ name: 'Acme' }).select().single(),
 *   { context: 'Organization creation' }
 * );
 * ```
 */
export declare function executeInsert<T>(query: PromiseLike<PostgrestSingleResponse<T>>, options?: QueryOptions): Promise<T>;
/**
 * Execute a Supabase update operation.
 *
 * @example
 * ```typescript
 * const updated = await executeUpdate(
 *   supabase.from('organizations').update({ name: 'New Name' }).eq('id', id).select().single(),
 *   { context: 'Organization update' }
 * );
 * ```
 */
export declare function executeUpdate<T>(query: PromiseLike<PostgrestSingleResponse<T>>, options?: SingleQueryOptions): Promise<T | null>;
/**
 * Execute a Supabase delete operation (or soft delete).
 */
export declare function executeDelete(query: PromiseLike<PostgrestSingleResponse<unknown>>, options?: QueryOptions): Promise<boolean>;
/**
 * Apply common filters to a Supabase query.
 *
 * @example
 * ```typescript
 * const query = applyFilters(
 *   supabase.from('secrets').select('*'),
 *   { softDelete: true, teamId: 'team_123', limit: 50 }
 * );
 * ```
 */
export declare function applyFilters<T extends AnyFilterBuilder>(query: T, filters: FilterOptions): T;
/**
 * Check if a record exists by ID.
 */
export declare function recordExists<T extends {
    select: (...args: any[]) => any;
}>(fromQuery: T, id: string, idColumn?: string): Promise<boolean>;
/**
 * Check if a record exists by a unique field.
 */
export declare function recordExistsByField<T extends {
    select: (...args: any[]) => any;
}>(fromQuery: T, field: string, value: string | number): Promise<boolean>;
/**
 * Perform a soft delete on a record.
 */
export declare function softDelete<T extends {
    update: (...args: any[]) => any;
}>(fromQuery: T, id: string, options?: QueryOptions): Promise<boolean>;
/**
 * Restore a soft-deleted record.
 */
export declare function restoreSoftDeleted<T extends {
    update: (...args: any[]) => any;
}>(fromQuery: T, id: string, options?: QueryOptions): Promise<boolean>;
/**
 * Map Postgres error codes to LSH error codes.
 */
export declare function mapPostgresErrorCode(pgCode: string): keyof typeof ErrorCodes;
/**
 * Create an LSHError from a Supabase error.
 */
export declare function createDbError(pgError: {
    code?: string;
    message: string;
    details?: string;
    hint?: string;
}, context?: string): LSHError;
declare const _default: {
    executeQuery: typeof executeQuery;
    executeSingleQuery: typeof executeSingleQuery;
    executeInsert: typeof executeInsert;
    executeUpdate: typeof executeUpdate;
    executeDelete: typeof executeDelete;
    applyFilters: typeof applyFilters;
    recordExists: typeof recordExists;
    recordExistsByField: typeof recordExistsByField;
    softDelete: typeof softDelete;
    restoreSoftDeleted: typeof restoreSoftDeleted;
    mapPostgresErrorCode: typeof mapPostgresErrorCode;
    createDbError: typeof createDbError;
};
export default _default;
