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
export const ErrorStatusCodes = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Custom API Error class with status code
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = ErrorStatusCodes.INTERNAL_SERVER_ERROR,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Send error response with consistent formatting
 *
 * @param res - Express response object
 * @param error - Error object
 * @param statusCode - HTTP status code (default: 500)
 */
export function sendError(
  res: Response,
  error: Error | ApiError | any,
  statusCode?: number
): void {
  const status = statusCode || (error instanceof ApiError ? error.statusCode : 500);

  const response: ApiErrorResponse = {
    error: error.message || 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
  };

  if (error instanceof ApiError) {
    if (error.code) response.code = error.code;
    if (error.details) response.details = error.details;
  }

  // Log error for debugging (in production, use proper logger)
  if (status >= 500) {
    console.error('API Error:', error);
  }

  res.status(status).json(response);
}

/**
 * Send success response with consistent formatting
 *
 * @param res - Express response object
 * @param data - Response data
 * @param statusCode - HTTP status code (default: 200)
 * @param includeTimestamp - Include timestamp in response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  includeTimestamp: boolean = false
): void {
  if (statusCode === 204) {
    res.status(204).send();
    return;
  }

  const response: any = includeTimestamp
    ? { data, timestamp: new Date().toISOString() }
    : data;

  res.status(statusCode).json(response);
}

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
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch((error) => {
      sendError(res, error);
    });
  };
}

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
export async function handleApiOperation<T>(
  res: Response,
  operation: () => Promise<T>,
  config: ApiHandlerConfig = {},
  webhookTrigger?: (event: string, data: any) => void
): Promise<void> {
  const {
    successStatus = 200,
    includeTimestamp = false,
    webhookEvent,
    webhookData,
  } = config;

  try {
    const result = await operation();

    // Send success response
    sendSuccess(res, result, successStatus, includeTimestamp);

    // Trigger webhook if configured
    if (webhookEvent && webhookTrigger) {
      const webhookPayload = webhookData ? webhookData(result) : result;
      webhookTrigger(webhookEvent, webhookPayload);
    }
  } catch (error: any) {
    // Determine appropriate status code
    let statusCode = 400;

    if (error instanceof ApiError) {
      statusCode = error.statusCode;
    } else if (error.message.includes('not found') || error.message.includes('Not found')) {
      statusCode = 404;
    } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      statusCode = 403;
    } else if (error.message.includes('exists') || error.message.includes('duplicate')) {
      statusCode = 409;
    }

    sendError(res, error, statusCode);
  }
}

/**
 * Create a typed API handler with webhook support
 *
 * Returns a function that can be used to handle API operations with
 * automatic error handling and webhook triggering
 *
 * @param webhookTrigger - Webhook trigger function
 * @returns Handler function
 */
export function createApiHandler(webhookTrigger?: (event: string, data: any) => void) {
  return async function <T>(
    res: Response,
    operation: () => Promise<T>,
    config: ApiHandlerConfig = {}
  ): Promise<void> {
    await handleApiOperation(res, operation, config, webhookTrigger);
  };
}

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
export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  sendError(res, error);
}
