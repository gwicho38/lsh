/**
 * LSH SaaS API Routes
 * RESTful API endpoints for the SaaS platform
 */
import type { Response, NextFunction, Application } from 'express';
import type { AuthenticatedRequest } from '../lib/saas-types.js';
/**
 * Middleware: Authenticate user from JWT token
 * Security is enforced by cryptographic JWT verification and database lookup,
 * not by input validation alone.
 */
export declare function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Middleware: Check organization membership
 */
export declare function requireOrganizationMembership(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Setup SaaS API routes
 */
export declare function setupSaaSApiRoutes(app: Application): void;
