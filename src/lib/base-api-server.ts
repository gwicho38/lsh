/**
 * Base API Server
 * Abstract base class for all API servers to eliminate duplication in:
 * - Express middleware setup
 * - Server lifecycle management
 * - Signal handling
 * - Error handling
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { EventEmitter } from 'events';
import { Server } from 'http';
import { createLogger, Logger } from './logger.js';

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
export abstract class BaseAPIServer extends EventEmitter {
  protected app: Application;
  protected server?: Server;
  protected config: BaseAPIServerConfig;
  protected logger: Logger;
  private isShuttingDown: boolean = false;

  /**
   * Create a new API server
   *
   * @param config - Server configuration
   * @param loggerName - Name for the logger context
   */
  constructor(config: Partial<BaseAPIServerConfig>, loggerName: string) {
    super();

    this.config = {
      port: 3000,
      corsOrigins: '*',
      enableHelmet: true,
      jsonLimit: '10mb',
      enableRequestLogging: true,
      enableSignalHandlers: true,
      enableErrorHandlers: true,
      ...config
    };

    this.logger = createLogger(loggerName);
    this.app = express();

    this.setupMiddleware();

    if (this.config.enableErrorHandlers) {
      this.setupErrorHandlers();
    }

    if (this.config.enableSignalHandlers) {
      this.setupSignalHandlers();
    }
  }

  /**
   * Setup Express middleware
   * Can be overridden for custom middleware setup
   */
  protected setupMiddleware(): void {
    // Security middleware
    if (this.config.enableHelmet) {
      this.app.use(helmet({
        crossOriginEmbedderPolicy: false,
      }));
    }

    // CORS
    this.app.use(this.configureCORS());

    // Body parsing
    this.app.use(express.json({ limit: this.config.jsonLimit }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    if (this.config.enableRequestLogging) {
      this.app.use(this.requestLogger.bind(this));
    }
  }

  /**
   * Configure CORS middleware
   * Can be overridden for custom CORS configuration
   */
  protected configureCORS(): ReturnType<typeof cors> {
    const origins = this.config.corsOrigins;

    if (origins === '*') {
      return cors();
    }

    if (Array.isArray(origins)) {
      return cors({
        origin: (origin, callback) => {
          if (!origin || origins.some(pattern => {
            const regex = new RegExp(pattern.replace(/\*/g, '.*'));
            return regex.test(origin);
          })) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        }
      });
    }

    return cors({ origin: origins });
  }

  /**
   * Request logging middleware
   */
  protected requestLogger(req: Request, res: Response, next: NextFunction): void {
    this.logger.info(`${req.method} ${req.path}`);
    next();
  }

  /**
   * Setup routes - must be implemented by subclasses
   */
  protected abstract setupRoutes(): void;

  /**
   * Setup error handlers for uncaught exceptions and unhandled rejections
   */
  protected setupErrorHandlers(): void {
    process.on('uncaughtException', (error: Error) => {
      this.logger.error('Uncaught Exception', error);
      this.handleFatalError(error);
    });

    process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
      this.logger.error('Unhandled Rejection', reason instanceof Error ? reason : new Error(String(reason)), {
        promise: String(promise)
      });
    });
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  protected setupSignalHandlers(): void {
    const signals = ['SIGTERM', 'SIGINT'] as const;

    signals.forEach(signal => {
      process.on(signal, () => {
        this.logger.info(`Received ${signal}, initiating graceful shutdown`);
        this.gracefulShutdown(signal);
      });
    });

    process.on('SIGHUP', () => {
      this.logger.info('Received SIGHUP');
      this.handleSIGHUP();
    });
  }

  /**
   * Handle SIGHUP signal - can be overridden for custom behavior (e.g., reload config)
   */
  protected handleSIGHUP(): void {
    this.logger.info('SIGHUP handler not implemented, ignoring');
  }

  /**
   * Handle fatal errors
   * @param error - The fatal error
   */
  protected handleFatalError(error: Error): void {
    this.logger.error('Fatal error, shutting down', error);
    process.exit(1);
  }

  /**
   * Perform graceful shutdown
   * @param signal - The signal that triggered the shutdown
   */
  protected async gracefulShutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    this.logger.info(`Graceful shutdown initiated by ${signal}`);

    try {
      // Give ongoing requests time to complete
      await this.stop();
      this.logger.info('Server stopped successfully');
      process.exit(0);
    } catch (error) {
      this.logger.error('Error during shutdown', error as Error);
      process.exit(1);
    }
  }

  /**
   * Start the API server
   * @returns Promise that resolves when server is listening
   */
  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Setup routes before starting server
        this.setupRoutes();

        this.server = this.app.listen(this.config.port, () => {
          this.logger.info(`Server started on port ${this.config.port}`);
          this.emit('started');
          resolve();
        });

        this.server!.on('error', (error: Error) => {
          this.logger.error('Server error', error);
          this.emit('error', error);
          reject(error);
        });

      } catch (error) {
        this.logger.error('Failed to start server', error as Error);
        reject(error);
      }
    });
  }

  /**
   * Stop the API server
   * @param timeout - Maximum time to wait for connections to close (ms)
   * @returns Promise that resolves when server is stopped
   */
  public async stop(timeout: number = 5000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.logger.info('Stopping server...');

      // Set timeout for force shutdown
      const forceShutdownTimer = setTimeout(() => {
        this.logger.warn('Force closing server after timeout');
        this.server?.close();
        resolve();
      }, timeout);

      this.server?.close((error) => {
        clearTimeout(forceShutdownTimer);

        if (error) {
          this.logger.error('Error stopping server', error);
          reject(error);
        } else {
          this.logger.info('Server stopped');
          this.emit('stopped');
          resolve();
        }
      });

      // Allow subclasses to cleanup
      this.onStop();
    });
  }

  /**
   * Hook called when server is stopping
   * Override this to cleanup resources, close connections, etc.
   */
  protected onStop(): void {
    // Override in subclasses if needed
  }

  /**
   * Get the Express application
   * @returns The Express app instance
   */
  public getApp(): Application {
    return this.app;
  }

  /**
   * Get the HTTP server
   * @returns The HTTP server instance
   */
  public getServer(): Server | undefined {
    return this.server;
  }

  /**
   * Check if server is running
   * @returns True if server is running
   */
  public isRunning(): boolean {
    return !!this.server?.listening;
  }

  /**
   * Get server configuration
   * @returns The server configuration
   */
  public getConfig(): BaseAPIServerConfig {
    return { ...this.config };
  }
}

export default BaseAPIServer;
