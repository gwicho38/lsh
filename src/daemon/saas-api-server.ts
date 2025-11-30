/**
 * LSH SaaS API Server
 * Express-based RESTful API for the SaaS platform
 */

import express, { type Express, type ErrorRequestHandler } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { setupSaaSApiRoutes } from './saas-api-routes.js';
import type { Server } from 'http';
import { getErrorMessage } from '../lib/saas-types.js';
import { ENV_VARS, DEFAULTS } from '../constants/index.js';
import { ERROR_CODES } from '../constants/errors.js';

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
export class SaaSApiServer {
  private app: Express;
  private config: SaaSApiServerConfig;
  private server: Server | undefined;

  constructor(config?: Partial<SaaSApiServerConfig>) {
    this.config = {
      port: config?.port || parseInt(process.env[ENV_VARS.LSH_SAAS_API_PORT] || String(DEFAULTS.SAAS_API_PORT)),
      host: config?.host || process.env[ENV_VARS.LSH_SAAS_API_HOST] || DEFAULTS.DEFAULT_HOST,
      corsOrigins: config?.corsOrigins || (process.env[ENV_VARS.LSH_CORS_ORIGINS]?.split(',') || [...DEFAULTS.DEFAULT_CORS_ORIGINS]),
      rateLimitWindowMs: config?.rateLimitWindowMs || 15 * 60 * 1000, // 15 minutes
      rateLimitMax: config?.rateLimitMax || DEFAULTS.MAX_EVENTS_LIMIT, // Max 100 requests per windowMs
    };

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandlers();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware() {
    // CORS
    this.app.use(
      cors({
        origin: this.config.corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      })
    );

    // Rate limiting - global limit for all requests
    const limiter = rateLimit({
      windowMs: this.config.rateLimitWindowMs,
      max: this.config.rateLimitMax,
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
        },
      },
      standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
      legacyHeaders: false, // Disable `X-RateLimit-*` headers
    });
    this.app.use(limiter);

    // Body parsers
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Security headers
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

      // CSP
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'"
      );

      next();
    });

    // Request logging
    this.app.use((req, res, next) => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        // Sanitize path to prevent log injection attacks
        const sanitizedPath = req.path.replace(/[\r\n]/g, '');
        const sanitizedIp = (req.ip || 'unknown').replace(/[\r\n]/g, '');
        console.log(
          `${req.method} ${sanitizedPath} ${res.statusCode} - ${duration}ms - ${sanitizedIp}`
        );
      });
      next();
    });
  }

  /**
   * Setup routes
   */
  private setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // API version
    this.app.get('/api/v1', (req, res) => {
      res.json({
        name: 'LSH SaaS API',
        version: '1.0.0',
        endpoints: {
          auth: '/api/v1/auth/*',
          organizations: '/api/v1/organizations/*',
          teams: '/api/v1/organizations/:id/teams/*',
          secrets: '/api/v1/teams/:id/secrets/*',
          billing: '/api/v1/organizations/:id/billing/*',
          audit: '/api/v1/organizations/:id/audit-logs',
        },
      });
    });

    // Setup SaaS routes
    setupSaaSApiRoutes(this.app);

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: ERROR_CODES.NOT_FOUND,
          message: `Endpoint ${req.method} ${req.path} not found`,
        },
      });
    });
  }

  /**
   * Setup error handlers
   */
  private setupErrorHandlers() {
    // Global error handler
    const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
      console.error('API Error:', err);

      // Don't leak error details in production
      const isDev = process.env[ENV_VARS.NODE_ENV] !== 'production';
      const statusCode = (err as { status?: number }).status || 500;
      const errorCode = (err as { code?: string }).code || ERROR_CODES.INTERNAL_ERROR;

      res.status(statusCode).json({
        success: false,
        error: {
          code: errorCode,
          message: isDev ? getErrorMessage(err) : 'Internal server error',
          details: isDev ? (err as Error).stack : undefined,
        },
      });
    };
    this.app.use(errorHandler);
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, this.config.host as string, () => {
          console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🔐  LSH SaaS API Server                                     ║
║                                                               ║
║   Status:  Running                                            ║
║   Port:    ${this.config.port.toString().padEnd(49)} ║
║   Host:    ${this.config.host?.padEnd(49)} ║
║                                                               ║
║   Endpoints:                                                  ║
║   - Health:  http://${this.config.host}:${this.config.port}/health${' '.repeat(26)} ║
║   - API:     http://${this.config.host}:${this.config.port}/api/v1${' '.repeat(27)} ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
          `);
          resolve();
        });

        this.server.on('error', (error: NodeJS.ErrnoException) => {
          if (error.code === 'EADDRINUSE') {
            reject(new Error(`Port ${this.config.port} is already in use`));
          } else {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err?: Error) => {
        if (err) {
          reject(err);
        } else {
          console.log('LSH SaaS API Server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Get Express app (for testing)
   */
  getApp(): Express {
    return this.app;
  }
}

/**
 * Start the server if run directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new SaaSApiServer();

  server.start().catch((error) => {
    console.error('Failed to start SaaS API server:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down gracefully...');
    await server.stop();
    process.exit(0);
  });
}
