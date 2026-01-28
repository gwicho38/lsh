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
import { LSHError, ErrorCodes, extractErrorMessage } from './lsh-error.js';

// Use a simplified type for filter builders since the full generic is complex
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFilterBuilder = { is: (...args: any[]) => any; eq: (...args: any[]) => any; order: (...args: any[]) => any; limit: (...args: any[]) => any; range: (...args: any[]) => any };

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// QUERY EXECUTION
// ============================================================================

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
export async function executeQuery<T>(
  query: PromiseLike<PostgrestSingleResponse<T[]>>,
  options: QueryOptions = {}
): Promise<T[]> {
  const { context = 'Query', throwOnError = true } = options;

  try {
    const { data, error } = await query;

    if (error) {
      if (throwOnError) {
        throw new LSHError(
          ErrorCodes.DB_QUERY_FAILED,
          `${context} failed: ${error.message}`,
          { code: error.code, details: error.details, hint: error.hint }
        );
      }
      return [];
    }

    return data || [];
  } catch (err) {
    if (err instanceof LSHError) {
      throw err;
    }
    if (throwOnError) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        `${context} failed: ${extractErrorMessage(err)}`,
        { originalError: extractErrorMessage(err) }
      );
    }
    return [];
  }
}

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
export async function executeSingleQuery<T>(
  query: PromiseLike<PostgrestSingleResponse<T>>,
  options: SingleQueryOptions = {}
): Promise<T | null> {
  const { context = 'Record', throwOnError = true, notFoundError = false } = options;

  try {
    const { data, error } = await query;

    if (error) {
      // Handle "no rows" error specifically
      if (error.code === 'PGRST116') {
        if (notFoundError) {
          throw new LSHError(
            ErrorCodes.RESOURCE_NOT_FOUND,
            `${context} not found`,
            { code: error.code }
          );
        }
        return null;
      }

      if (throwOnError) {
        throw new LSHError(
          ErrorCodes.DB_QUERY_FAILED,
          `${context} query failed: ${error.message}`,
          { code: error.code, details: error.details, hint: error.hint }
        );
      }
      return null;
    }

    return data;
  } catch (err) {
    if (err instanceof LSHError) {
      throw err;
    }
    if (throwOnError) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        `${context} query failed: ${extractErrorMessage(err)}`,
        { originalError: extractErrorMessage(err) }
      );
    }
    return null;
  }
}

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
export async function executeInsert<T>(
  query: PromiseLike<PostgrestSingleResponse<T>>,
  options: QueryOptions = {}
): Promise<T> {
  const { context = 'Insert', throwOnError = true } = options;

  try {
    const { data, error } = await query;

    if (error) {
      // Handle unique constraint violations
      if (error.code === '23505') {
        throw new LSHError(
          ErrorCodes.RESOURCE_ALREADY_EXISTS,
          `${context} failed: Record already exists`,
          { code: error.code, details: error.details }
        );
      }

      if (throwOnError) {
        throw new LSHError(
          ErrorCodes.DB_QUERY_FAILED,
          `${context} failed: ${error.message}`,
          { code: error.code, details: error.details, hint: error.hint }
        );
      }
      throw new Error(`${context} failed: ${error.message}`);
    }

    if (!data) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        `${context} failed: No data returned`,
        { context }
      );
    }

    return data;
  } catch (err) {
    if (err instanceof LSHError) {
      throw err;
    }
    throw new LSHError(
      ErrorCodes.DB_QUERY_FAILED,
      `${context} failed: ${extractErrorMessage(err)}`,
      { originalError: extractErrorMessage(err) }
    );
  }
}

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
export async function executeUpdate<T>(
  query: PromiseLike<PostgrestSingleResponse<T>>,
  options: SingleQueryOptions = {}
): Promise<T | null> {
  const { context = 'Update', throwOnError = true, notFoundError = false } = options;

  try {
    const { data, error } = await query;

    if (error) {
      if (error.code === 'PGRST116' && notFoundError) {
        throw new LSHError(
          ErrorCodes.RESOURCE_NOT_FOUND,
          `${context} failed: Record not found`,
          { code: error.code }
        );
      }

      if (throwOnError) {
        throw new LSHError(
          ErrorCodes.DB_QUERY_FAILED,
          `${context} failed: ${error.message}`,
          { code: error.code, details: error.details, hint: error.hint }
        );
      }
      return null;
    }

    return data;
  } catch (err) {
    if (err instanceof LSHError) {
      throw err;
    }
    if (throwOnError) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        `${context} failed: ${extractErrorMessage(err)}`,
        { originalError: extractErrorMessage(err) }
      );
    }
    return null;
  }
}

/**
 * Execute a Supabase delete operation (or soft delete).
 */
export async function executeDelete(
  query: PromiseLike<PostgrestSingleResponse<unknown>>,
  options: QueryOptions = {}
): Promise<boolean> {
  const { context = 'Delete', throwOnError = true } = options;

  try {
    const { error } = await query;

    if (error) {
      if (throwOnError) {
        throw new LSHError(
          ErrorCodes.DB_QUERY_FAILED,
          `${context} failed: ${error.message}`,
          { code: error.code, details: error.details }
        );
      }
      return false;
    }

    return true;
  } catch (err) {
    if (err instanceof LSHError) {
      throw err;
    }
    if (throwOnError) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        `${context} failed: ${extractErrorMessage(err)}`,
        { originalError: extractErrorMessage(err) }
      );
    }
    return false;
  }
}

// ============================================================================
// QUERY BUILDERS
// ============================================================================

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
export function applyFilters<T extends AnyFilterBuilder>(query: T, filters: FilterOptions): T {
  let result = query;

  // Soft delete filter
  if (filters.softDelete !== false) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = (result as any).is('deleted_at', null) as T;
  }

  // Organization filter
  if (filters.organizationId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = (result as any).eq('organization_id', filters.organizationId) as T;
  }

  // Team filter
  if (filters.teamId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = (result as any).eq('team_id', filters.teamId) as T;
  }

  // User filter
  if (filters.userId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = (result as any).eq('user_id', filters.userId) as T;
  }

  // Ordering
  if (filters.orderBy) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = (result as any).order(filters.orderBy, {
      ascending: filters.orderDirection !== 'desc',
    }) as T;
  }

  // Pagination
  if (filters.limit !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = (result as any).limit(filters.limit) as T;
  }

  if (filters.offset !== undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result = (result as any).range(filters.offset, filters.offset + (filters.limit || 50) - 1) as T;
  }

  return result;
}

// ============================================================================
// EXISTENCE CHECKS
// ============================================================================

/**
 * Check if a record exists by ID.
 */
export async function recordExists<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends { select: (...args: any[]) => any }
>(
  fromQuery: T,
  id: string,
  idColumn = 'id'
): Promise<boolean> {
  try {
    const { data } = await fromQuery.select(idColumn).eq(idColumn, id).single();
    return data !== null;
  } catch {
    return false;
  }
}

/**
 * Check if a record exists by a unique field.
 */
export async function recordExistsByField<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends { select: (...args: any[]) => any }
>(
  fromQuery: T,
  field: string,
  value: string | number
): Promise<boolean> {
  try {
    const { data } = await fromQuery.select(field).eq(field, value).single();
    return data !== null;
  } catch {
    return false;
  }
}

// ============================================================================
// SOFT DELETE UTILITIES
// ============================================================================

/**
 * Perform a soft delete on a record.
 */
export async function softDelete<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends { update: (...args: any[]) => any }
>(
  fromQuery: T,
  id: string,
  options: QueryOptions = {}
): Promise<boolean> {
  const { context = 'Soft delete', throwOnError = true } = options;

  try {
    const { error } = await fromQuery
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      if (throwOnError) {
        throw new LSHError(
          ErrorCodes.DB_QUERY_FAILED,
          `${context} failed: ${error.message}`,
          { code: error.code, id }
        );
      }
      return false;
    }

    return true;
  } catch (err) {
    if (err instanceof LSHError) {
      throw err;
    }
    if (throwOnError) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        `${context} failed: ${extractErrorMessage(err)}`,
        { id, originalError: extractErrorMessage(err) }
      );
    }
    return false;
  }
}

/**
 * Restore a soft-deleted record.
 */
export async function restoreSoftDeleted<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends { update: (...args: any[]) => any }
>(
  fromQuery: T,
  id: string,
  options: QueryOptions = {}
): Promise<boolean> {
  const { context = 'Restore', throwOnError = true } = options;

  try {
    const { error } = await fromQuery.update({ deleted_at: null }).eq('id', id);

    if (error) {
      if (throwOnError) {
        throw new LSHError(
          ErrorCodes.DB_QUERY_FAILED,
          `${context} failed: ${error.message}`,
          { code: error.code, id }
        );
      }
      return false;
    }

    return true;
  } catch (err) {
    if (err instanceof LSHError) {
      throw err;
    }
    if (throwOnError) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        `${context} failed: ${extractErrorMessage(err)}`,
        { id, originalError: extractErrorMessage(err) }
      );
    }
    return false;
  }
}

// ============================================================================
// ERROR CODE MAPPING
// ============================================================================

/**
 * Map Postgres error codes to LSH error codes.
 */
export function mapPostgresErrorCode(pgCode: string): keyof typeof ErrorCodes {
  const codeMap: Record<string, keyof typeof ErrorCodes> = {
    '23505': 'RESOURCE_ALREADY_EXISTS', // unique_violation
    '23503': 'DB_CONSTRAINT_VIOLATION', // foreign_key_violation
    '23502': 'VALIDATION_REQUIRED_FIELD', // not_null_violation
    '23514': 'VALIDATION_OUT_OF_RANGE', // check_violation
    '42P01': 'DB_QUERY_FAILED', // undefined_table
    '42703': 'DB_QUERY_FAILED', // undefined_column
    'PGRST116': 'RESOURCE_NOT_FOUND', // no rows found
    'PGRST301': 'DB_QUERY_FAILED', // JWT expired
    'PGRST302': 'AUTH_INVALID_TOKEN', // JWT invalid
    '08006': 'DB_CONNECTION_FAILED', // connection failure
    '08001': 'DB_CONNECTION_FAILED', // unable to connect
    '57014': 'DB_TIMEOUT', // query_canceled (timeout)
  };

  return codeMap[pgCode] || 'DB_QUERY_FAILED';
}

/**
 * Create an LSHError from a Supabase error.
 */
export function createDbError(
  pgError: { code?: string; message: string; details?: string; hint?: string },
  context?: string
): LSHError {
  const code = pgError.code ? mapPostgresErrorCode(pgError.code) : 'DB_QUERY_FAILED';
  const message = context
    ? `${context}: ${pgError.message}`
    : pgError.message;

  return new LSHError(ErrorCodes[code], message, {
    pgCode: pgError.code,
    details: pgError.details,
    hint: pgError.hint,
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  executeQuery,
  executeSingleQuery,
  executeInsert,
  executeUpdate,
  executeDelete,
  applyFilters,
  recordExists,
  recordExistsByField,
  softDelete,
  restoreSoftDeleted,
  mapPostgresErrorCode,
  createDbError,
};
