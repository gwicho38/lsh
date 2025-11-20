/**
 * LSH SaaS API Routes
 * RESTful API endpoints for the SaaS platform
 */
import type { Response, NextFunction } from 'express';
/**
 * Middleware: Authenticate user from JWT token
 * Security is enforced by cryptographic JWT verification and database lookup,
 * not by input validation alone.
 */
export declare function authenticateUser(req: any, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Middleware: Check organization membership
 */
export declare function requireOrganizationMembership(req: any, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Setup SaaS API routes
 */
export declare function setupSaaSApiRoutes(app: any): void;
