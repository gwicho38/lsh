/**
 * Base API Server
 * Abstract base class for all API servers to eliminate duplication in:
 * - Express middleware setup
 * - Server lifecycle management
 * - Signal handling
 * - Error handling
 */
import { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { EventEmitter } from 'events';
import { Server } from 'http';
import { Logger } from './logger.js';
/**
 * Configuration for the base API server
 */
export interface BaseAPIServerConfig {
    port: number;
    corsOrigins?: string[] | string;
    enableHelmet?: boolean;
    jsonLimit?: string;
    enableRequestLogging?: boolean;
    enableSignalHandlers?: boolean;
    enableErrorHandlers?: boolean;
}
/**
 * CORS configuration helper
 */
export interface CORSConfig {
    origins?: string[] | string;
    credentials?: boolean;
    methods?: string[];
}
/**
 * Abstract base class for API servers
 *
 * Provides:
 * - Express app setup with common middleware
 * - Server lifecycle (start/stop)
 * - Signal handling (SIGTERM, SIGINT, SIGHUP)
 * - Error handling (uncaughtException, unhandledRejection)
 * - Request logging
 * - Structured logging
 *
 * @example
 * ```typescript
 * class MyAPIServer extends BaseAPIServer {
 *   constructor() {
 *     super({ port: 3000 }, 'MyAPI');
 *   }
 *
 *   protected setupRoutes(): void {
 *     this.app.get('/api/hello', (req, res) => {
 *       res.json({ message: 'Hello World' });
 *     });
 *   }
 * }
 * ```
 */
export declare abstract class BaseAPIServer extends EventEmitter {
    protected app: Application;
    protected server?: Server;
    protected config: BaseAPIServerConfig;
    protected logger: Logger;
    private isShuttingDown;
    /**
     * Create a new API server
     *
     * @param config - Server configuration
     * @param loggerName - Name for the logger context
     */
    constructor(config: Partial<BaseAPIServerConfig>, loggerName: string);
    /**
     * Setup Express middleware
     * Can be overridden for custom middleware setup
     */
    protected setupMiddleware(): void;
    /**
     * Configure CORS middleware
     * Can be overridden for custom CORS configuration
     */
    protected configureCORS(): ReturnType<typeof cors>;
    /**
     * Request logging middleware
     */
    protected requestLogger(req: Request, res: Response, next: NextFunction): void;
    /**
     * Setup routes - must be implemented by subclasses
     */
    protected abstract setupRoutes(): void;
    /**
     * Setup error handlers for uncaught exceptions and unhandled rejections
     */
    protected setupErrorHandlers(): void;
    /**
     * Setup signal handlers for graceful shutdown
     */
    protected setupSignalHandlers(): void;
    /**
     * Handle SIGHUP signal - can be overridden for custom behavior (e.g., reload config)
     */
    protected handleSIGHUP(): void;
    /**
     * Handle fatal errors
     * @param error - The fatal error
     */
    protected handleFatalError(error: Error): void;
    /**
     * Perform graceful shutdown
     * @param signal - The signal that triggered the shutdown
     */
    protected gracefulShutdown(signal: string): Promise<void>;
    /**
     * Start the API server
     * @returns Promise that resolves when server is listening
     */
    start(): Promise<void>;
    /**
     * Stop the API server
     * @param timeout - Maximum time to wait for connections to close (ms)
     * @returns Promise that resolves when server is stopped
     */
    stop(timeout?: number): Promise<void>;
    /**
     * Hook called when server is stopping
     * Override this to cleanup resources, close connections, etc.
     */
    protected onStop(): void;
    /**
     * Get the Express application
     * @returns The Express app instance
     */
    getApp(): Application;
    /**
     * Get the HTTP server
     * @returns The HTTP server instance
     */
    getServer(): Server | undefined;
    /**
     * Check if server is running
     * @returns True if server is running
     */
    isRunning(): boolean;
    /**
     * Get server configuration
     * @returns The server configuration
     */
    getConfig(): BaseAPIServerConfig;
}
export default BaseAPIServer;
