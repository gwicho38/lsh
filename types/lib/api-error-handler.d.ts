/**
 * API Error Handler
 * Consolidates error response formatting across all API endpoints
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
    error: string;
    code?: string;
    details?: any;
    timestamp?: string;
}
/**
 * Standard API success response format
 */
export interface ApiSuccessResponse<T = any> {
    data: T;
    timestamp?: string;
}
/**
 * Configuration for handling API operations
 */
export interface ApiHandlerConfig {
    successStatus?: number;
    includeTimestamp?: boolean;
    webhookEvent?: string;
    webhookData?: (result: any) => any;
}
/**
 * HTTP status codes for common error types
 */
export declare const ErrorStatusCodes: {
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly INTERNAL_SERVER_ERROR: 500;
    readonly SERVICE_UNAVAILABLE: 503;
};
/**
 * Custom API Error class with status code
 */
export declare class ApiError extends Error {
    statusCode: number;
    code?: string | undefined;
    details?: any | undefined;
    constructor(message: string, statusCode?: number, code?: string | undefined, details?: any | undefined);
}
/**
 * Send error response with consistent formatting
 *
 * @param res - Express response object
 * @param error - Error object
 * @param statusCode - HTTP status code (default: 500)
 */
export declare function sendError(res: Response, error: Error | ApiError | any, statusCode?: number): void;
/**
 * Send success response with consistent formatting
 *
 * @param res - Express response object
 * @param data - Response data
 * @param statusCode - HTTP status code (default: 200)
 * @param includeTimestamp - Include timestamp in response
 */
export declare function sendSuccess<T>(res: Response, data: T, statusCode?: number, includeTimestamp?: boolean): void;
/**
 * Wrapper for async route handlers with automatic error handling
 *
 * Eliminates the need for try-catch blocks in every route handler
 *
 * @param handler - Async route handler function
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * app.get('/api/jobs', asyncHandler(async (req, res) => {
 *   const jobs = await getJobs();
 *   sendSuccess(res, jobs);
 * }));
 * ```
 */
export declare function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => Promise<void>): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Execute an operation with automatic success/error handling
 *
 * This is the most powerful wrapper - it handles:
 * - Try-catch
 * - Success response formatting
 * - Error response formatting
 * - Optional webhook triggering
 *
 * @param res - Express response object
 * @param operation - Async operation to execute
 * @param config - Configuration options
 * @param webhookTrigger - Optional webhook trigger function
 *
 * @example
 * ```typescript
 * app.post('/api/jobs', async (req, res) => {
 *   await handleApiOperation(
 *     res,
 *     async () => this.daemon.addJob(req.body),
 *     {
 *       successStatus: 201,
 *       webhookEvent: 'job.created'
 *     },
 *     (event, data) => this.triggerWebhook(event, data)
 *   );
 * });
 * ```
 */
export declare function handleApiOperation<T>(res: Response, operation: () => Promise<T>, config?: ApiHandlerConfig, webhookTrigger?: (event: string, data: any) => void): Promise<void>;
/**
 * Create a typed API handler with webhook support
 *
 * Returns a function that can be used to handle API operations with
 * automatic error handling and webhook triggering
 *
 * @param webhookTrigger - Webhook trigger function
 * @returns Handler function
 */
export declare function createApiHandler(webhookTrigger?: (event: string, data: any) => void): <T>(res: Response, operation: () => Promise<T>, config?: ApiHandlerConfig) => Promise<void>;
/**
 * Express error handling middleware
 *
 * Should be added after all routes
 *
 * @example
 * ```typescript
 * app.use(errorMiddleware);
 * ```
 */
export declare function errorMiddleware(error: Error, req: Request, res: Response, next: NextFunction): void;
