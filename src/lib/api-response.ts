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
import { ERROR_CODES } from '../constants/errors.js';

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
 * HTTP status codes mapped to error codes
 * @internal
 */
const ERROR_STATUS_MAP: Record<string, number> = {
  [ERROR_CODES.UNAUTHORIZED]: 401,
  [ERROR_CODES.INVALID_CREDENTIALS]: 401,
  [ERROR_CODES.INVALID_TOKEN]: 401,
  [ERROR_CODES.EMAIL_NOT_VERIFIED]: 401,
  [ERROR_CODES.FORBIDDEN]: 403,
  [ERROR_CODES.NOT_FOUND]: 404,
  [ERROR_CODES.INVALID_INPUT]: 400,
  [ERROR_CODES.ALREADY_EXISTS]: 409,
  [ERROR_CODES.EMAIL_ALREADY_EXISTS]: 409,
  [ERROR_CODES.PAYMENT_REQUIRED]: 402,
  [ERROR_CODES.TIER_LIMIT_EXCEEDED]: 403,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
  RATE_LIMIT_EXCEEDED: 429,
};

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
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): Response {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

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
export function sendCreated<T>(res: Response, data: T): Response {
  return sendSuccess(res, data, 201);
}

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
export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode?: number
): Response {
  const status = statusCode ?? ERROR_STATUS_MAP[code] ?? 500;
  return res.status(status).json({
    success: false,
    error: { code, message },
  });
}

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
export const ApiErrors = {
  /**
   * Send a 401 Unauthorized response
   * @param res - Express response object
   * @param message - Custom error message (default: 'Authentication required')
   */
  unauthorized(res: Response, message = 'Authentication required'): Response {
    return sendError(res, ERROR_CODES.UNAUTHORIZED, message);
  },

  /**
   * Send a 401 Invalid Token response
   * @param res - Express response object
   * @param message - Custom error message (default: 'Invalid or expired token')
   */
  invalidToken(res: Response, message = 'Invalid or expired token'): Response {
    return sendError(res, ERROR_CODES.INVALID_TOKEN, message);
  },

  /**
   * Send a 403 Forbidden response
   * @param res - Express response object
   * @param message - Custom error message (default: 'Access denied')
   */
  forbidden(res: Response, message = 'Access denied'): Response {
    return sendError(res, ERROR_CODES.FORBIDDEN, message);
  },

  /**
   * Send a 404 Not Found response
   * @param res - Express response object
   * @param resource - Resource name for the error message (default: 'Resource')
   */
  notFound(res: Response, resource = 'Resource'): Response {
    return sendError(res, ERROR_CODES.NOT_FOUND, `${resource} not found`);
  },

  /**
   * Send a 400 Bad Request response for invalid input
   * @param res - Express response object
   * @param message - Validation error message
   */
  invalidInput(res: Response, message: string): Response {
    return sendError(res, ERROR_CODES.INVALID_INPUT, message);
  },

  /**
   * Send a 409 Conflict response for duplicate resources
   * @param res - Express response object
   * @param resource - Resource name for the error message (default: 'Resource')
   */
  alreadyExists(res: Response, resource = 'Resource'): Response {
    return sendError(res, ERROR_CODES.ALREADY_EXISTS, `${resource} already exists`);
  },

  /**
   * Send a 500 Internal Server Error response
   * @param res - Express response object
   * @param message - Custom error message (default: 'An internal error occurred')
   */
  internalError(res: Response, message = 'An internal error occurred'): Response {
    return sendError(res, ERROR_CODES.INTERNAL_ERROR, message);
  },

  /**
   * Send a 402 Payment Required response
   * @param res - Express response object
   * @param message - Custom error message (default: 'Payment required')
   */
  paymentRequired(res: Response, message = 'Payment required'): Response {
    return sendError(res, ERROR_CODES.PAYMENT_REQUIRED, message);
  },

  /**
   * Send a 403 Tier Limit Exceeded response
   * @param res - Express response object
   * @param message - Custom error message (default: 'Plan limit exceeded')
   */
  tierLimitExceeded(res: Response, message = 'Plan limit exceeded'): Response {
    return sendError(res, ERROR_CODES.TIER_LIMIT_EXCEEDED, message);
  },

  /**
   * Send a 429 Rate Limit Exceeded response
   * @param res - Express response object
   * @param message - Custom error message (default: 'Too many requests')
   */
  rateLimitExceeded(res: Response, message = 'Too many requests'): Response {
    return sendError(res, 'RATE_LIMIT_EXCEEDED', message, 429);
  },
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
export function extractApiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}
