/**
 * API Response Builder
 *
 * Standardized response utilities for the SaaS API.
 * Centralizes response formatting and error handling.
 */
import type { Response } from 'express';
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
 * Send a successful API response
 */
export declare function sendSuccess<T>(res: Response, data: T, statusCode?: number): Response;
/**
 * Send a created (201) response
 */
export declare function sendCreated<T>(res: Response, data: T): Response;
/**
 * Send an error response with automatic status code mapping
 */
export declare function sendError(res: Response, code: string, message: string, statusCode?: number): Response;
/**
 * Common error response helpers
 */
export declare const ApiErrors: {
    unauthorized(res: Response, message?: string): Response;
    invalidToken(res: Response, message?: string): Response;
    forbidden(res: Response, message?: string): Response;
    notFound(res: Response, resource?: string): Response;
    invalidInput(res: Response, message: string): Response;
    alreadyExists(res: Response, resource?: string): Response;
    internalError(res: Response, message?: string): Response;
    paymentRequired(res: Response, message?: string): Response;
    tierLimitExceeded(res: Response, message?: string): Response;
    rateLimitExceeded(res: Response, message?: string): Response;
};
/**
 * Extract error message from unknown error type
 */
export declare function extractApiErrorMessage(error: unknown): string;
