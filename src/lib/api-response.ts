/**
 * API Response Builder
 *
 * Standardized response utilities for the SaaS API.
 * Centralizes response formatting and error handling.
 */

import type { Response } from 'express';
import { ERROR_CODES } from '../constants/errors.js';

/**
 * Standard API response structure
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * HTTP status codes mapped to error codes
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
 */
export function sendSuccess<T>(res: Response, data: T, statusCode = 200): Response {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

/**
 * Send a created (201) response
 */
export function sendCreated<T>(res: Response, data: T): Response {
  return sendSuccess(res, data, 201);
}

/**
 * Send an error response with automatic status code mapping
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
 * Common error response helpers
 */
export const ApiErrors = {
  unauthorized(res: Response, message = 'Authentication required'): Response {
    return sendError(res, ERROR_CODES.UNAUTHORIZED, message);
  },

  invalidToken(res: Response, message = 'Invalid or expired token'): Response {
    return sendError(res, ERROR_CODES.INVALID_TOKEN, message);
  },

  forbidden(res: Response, message = 'Access denied'): Response {
    return sendError(res, ERROR_CODES.FORBIDDEN, message);
  },

  notFound(res: Response, resource = 'Resource'): Response {
    return sendError(res, ERROR_CODES.NOT_FOUND, `${resource} not found`);
  },

  invalidInput(res: Response, message: string): Response {
    return sendError(res, ERROR_CODES.INVALID_INPUT, message);
  },

  alreadyExists(res: Response, resource = 'Resource'): Response {
    return sendError(res, ERROR_CODES.ALREADY_EXISTS, `${resource} already exists`);
  },

  internalError(res: Response, message = 'An internal error occurred'): Response {
    return sendError(res, ERROR_CODES.INTERNAL_ERROR, message);
  },

  paymentRequired(res: Response, message = 'Payment required'): Response {
    return sendError(res, ERROR_CODES.PAYMENT_REQUIRED, message);
  },

  tierLimitExceeded(res: Response, message = 'Plan limit exceeded'): Response {
    return sendError(res, ERROR_CODES.TIER_LIMIT_EXCEEDED, message);
  },

  rateLimitExceeded(res: Response, message = 'Too many requests'): Response {
    return sendError(res, 'RATE_LIMIT_EXCEEDED', message, 429);
  },
};

/**
 * Extract error message from unknown error type
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
