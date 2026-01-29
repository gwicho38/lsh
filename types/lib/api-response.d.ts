/**
 * API Response Builder
 *
 * Standardized response utilities for the SaaS API.
 * Centralizes response formatting and error handling.
 *
 * @module api-response
 * @example
 * ```typescript
 * import { sendSuccess, ApiErrors } from './api-response.js';
 *
 * // Success response
 * app.get('/users/:id', async (req, res) => {
 *   const user = await getUser(req.params.id);
 *   return sendSuccess(res, { user });
 * });
 *
 * // Error response
 * app.get('/protected', async (req, res) => {
 *   if (!req.user) {
 *     return ApiErrors.unauthorized(res);
 *   }
 * });
 * ```
 */
import type { Response } from 'express';
/**
 * Standard API success response structure
 * @template T - The type of the data payload
 */
export interface ApiSuccessResponse<T = unknown> {
    /** Always true for success responses */
    success: true;
    /** The response data payload */
    data: T;
}
/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
    /** Always false for error responses */
    success: false;
    /** Error details */
    error: {
        /** Machine-readable error code (e.g., 'UNAUTHORIZED', 'NOT_FOUND') */
        code: string;
        /** Human-readable error message */
        message: string;
    };
}
/**
 * Union type for all API responses
 * @template T - The type of the data payload for success responses
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
/**
 * Send a successful API response
 *
 * @template T - The type of the data payload
 * @param res - Express response object
 * @param data - The data to send in the response
 * @param statusCode - HTTP status code (default: 200)
 * @returns The Express response object
 *
 * @example
 * ```typescript
 * return sendSuccess(res, { user: { id: '123', name: 'John' } });
 * ```
 */
export declare function sendSuccess<T>(res: Response, data: T, statusCode?: number): Response;
/**
 * Send a created (201) response for newly created resources
 *
 * @template T - The type of the data payload
 * @param res - Express response object
 * @param data - The created resource data
 * @returns The Express response object
 *
 * @example
 * ```typescript
 * const newUser = await createUser(userData);
 * return sendCreated(res, { user: newUser });
 * ```
 */
export declare function sendCreated<T>(res: Response, data: T): Response;
/**
 * Send an error response with automatic status code mapping
 *
 * @param res - Express response object
 * @param code - Error code (e.g., 'UNAUTHORIZED', 'NOT_FOUND')
 * @param message - Human-readable error message
 * @param statusCode - Optional explicit HTTP status code (auto-mapped if not provided)
 * @returns The Express response object
 *
 * @example
 * ```typescript
 * return sendError(res, 'CUSTOM_ERROR', 'Something went wrong', 422);
 * ```
 */
export declare function sendError(res: Response, code: string, message: string, statusCode?: number): Response;
/**
 * Common error response helpers with pre-configured error codes and messages.
 * Each method returns the appropriate HTTP status code automatically.
 *
 * @example
 * ```typescript
 * // 401 Unauthorized
 * return ApiErrors.unauthorized(res);
 *
 * // 404 Not Found with custom resource name
 * return ApiErrors.notFound(res, 'User');
 *
 * // 400 Bad Request with validation message
 * return ApiErrors.invalidInput(res, 'Email is required');
 * ```
 */
export declare const ApiErrors: {
    /**
     * Send a 401 Unauthorized response
     * @param res - Express response object
     * @param message - Custom error message (default: 'Authentication required')
     */
    unauthorized(res: Response, message?: string): Response;
    /**
     * Send a 401 Invalid Token response
     * @param res - Express response object
     * @param message - Custom error message (default: 'Invalid or expired token')
     */
    invalidToken(res: Response, message?: string): Response;
    /**
     * Send a 403 Forbidden response
     * @param res - Express response object
     * @param message - Custom error message (default: 'Access denied')
     */
    forbidden(res: Response, message?: string): Response;
    /**
     * Send a 404 Not Found response
     * @param res - Express response object
     * @param resource - Resource name for the error message (default: 'Resource')
     */
    notFound(res: Response, resource?: string): Response;
    /**
     * Send a 400 Bad Request response for invalid input
     * @param res - Express response object
     * @param message - Validation error message
     */
    invalidInput(res: Response, message: string): Response;
    /**
     * Send a 409 Conflict response for duplicate resources
     * @param res - Express response object
     * @param resource - Resource name for the error message (default: 'Resource')
     */
    alreadyExists(res: Response, resource?: string): Response;
    /**
     * Send a 500 Internal Server Error response
     * @param res - Express response object
     * @param message - Custom error message (default: 'An internal error occurred')
     */
    internalError(res: Response, message?: string): Response;
    /**
     * Send a 402 Payment Required response
     * @param res - Express response object
     * @param message - Custom error message (default: 'Payment required')
     */
    paymentRequired(res: Response, message?: string): Response;
    /**
     * Send a 403 Tier Limit Exceeded response
     * @param res - Express response object
     * @param message - Custom error message (default: 'Plan limit exceeded')
     */
    tierLimitExceeded(res: Response, message?: string): Response;
    /**
     * Send a 429 Rate Limit Exceeded response
     * @param res - Express response object
     * @param message - Custom error message (default: 'Too many requests')
     */
    rateLimitExceeded(res: Response, message?: string): Response;
};
/**
 * Extract a human-readable error message from an unknown error type.
 * Useful in catch blocks where the error type is unknown.
 *
 * @param error - The caught error (unknown type)
 * @returns A string error message
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   return ApiErrors.internalError(res, extractApiErrorMessage(error));
 * }
 * ```
 */
export declare function extractApiErrorMessage(error: unknown): string;
