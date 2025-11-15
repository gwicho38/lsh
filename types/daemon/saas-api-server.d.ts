/**
 * LSH SaaS API Server
 * Express-based RESTful API for the SaaS platform
 */
import { type Express } from 'express';
export interface SaaSApiServerConfig {
    port: number;
    host?: string;
    corsOrigins?: string[];
    rateLimitWindowMs?: number;
    rateLimitMax?: number;
}
/**
 * SaaS API Server
 */
export declare class SaaSApiServer {
    private app;
    private config;
    private server;
    constructor(config?: Partial<SaaSApiServerConfig>);
    /**
     * Setup middleware
     */
    private setupMiddleware;
    /**
     * Setup routes
     */
    private setupRoutes;
    /**
     * Setup error handlers
     */
    private setupErrorHandlers;
    /**
     * Start the server
     */
    start(): Promise<void>;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
    /**
     * Get Express app (for testing)
     */
    getApp(): Express;
}
