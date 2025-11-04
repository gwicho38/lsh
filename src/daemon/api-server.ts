/**
 * LSH API Server - RESTful API for daemon control and job management
 */

import { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { LSHJobDaemon } from './lshd.js';
import type { JobSpec as _JobSpec } from '../lib/job-manager.js';
import { handleApiOperation } from '../lib/api-error-handler.js';
import { BaseAPIServer, BaseAPIServerConfig } from '../lib/base-api-server.js';

export interface ApiConfig extends BaseAPIServerConfig {
  apiKey?: string;
  jwtSecret?: string;
  enableWebhooks?: boolean;
  webhookEndpoints?: string[];
}

export class LSHApiServer extends BaseAPIServer {
  private daemon: LSHJobDaemon;
  private apiConfig: ApiConfig;
  private clients = new Set<Response>(); // SSE clients

  constructor(daemon: LSHJobDaemon, config: Partial<ApiConfig> = {}) {
    const baseConfig: Partial<BaseAPIServerConfig> = {
      port: config.port || 3030,
      corsOrigins: config.corsOrigins || ['http://localhost:*'],
      jsonLimit: config.jsonLimit || '10mb',
      enableHelmet: config.enableHelmet !== false,
      enableRequestLogging: config.enableRequestLogging !== false,
    };

    super(baseConfig, 'LSHApiServer');

    this.daemon = daemon;
    this.apiConfig = {
      ...this.config,
      apiKey: config.apiKey || process.env.LSH_API_KEY || crypto.randomBytes(32).toString('hex'),
      jwtSecret: config.jwtSecret || process.env.LSH_JWT_SECRET || crypto.randomBytes(32).toString('hex'),
      enableWebhooks: config.enableWebhooks || false,
      webhookEndpoints: config.webhookEndpoints || [],
      ...config
    };

    this.setupEventHandlers();
  }

  /**
   * Override CORS configuration to support wildcard patterns
   */
  protected configureCORS(): ReturnType<typeof cors> {
    const origins = this.config.corsOrigins;

    if (origins === '*' || !origins) {
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
   * Helper method to handle API operations with automatic error handling and webhooks
   */
  private async handleOperation<T>(
    res: Response,
    operation: () => Promise<T>,
    successStatus: number = 200,
    webhookEvent?: string
  ): Promise<void> {
    await handleApiOperation(
      res,
      operation,
      { successStatus, webhookEvent },
      this.apiConfig.enableWebhooks ? this.triggerWebhook.bind(this) : undefined
    );
  }

  private authenticateRequest(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];

    // Check API key
    if (apiKey && apiKey === this.apiConfig.apiKey) {
      return next();
    }

    // Check JWT token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        jwt.verify(token, this.apiConfig.jwtSecret!);
        return next();
      } catch (_err) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    return res.status(401).json({ error: 'Authentication required' });
  }

  protected setupRoutes(): void {
    // Health check (no auth)
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Generate JWT token
    this.app.post('/api/auth', (req, res) => {
      const { apiKey } = req.body;
      if (apiKey === this.apiConfig.apiKey) {
        const token = jwt.sign(
          { type: 'api-access', created: Date.now() },
          this.apiConfig.jwtSecret!,
          { expiresIn: '24h' }
        );
        res.json({ token });
      } else {
        res.status(401).json({ error: 'Invalid API key' });
      }
    });

    // Protected routes
    this.app.use('/api', this.authenticateRequest.bind(this));

    // Daemon status
    this.app.get('/api/status', async (req, res) => {
      await this.handleOperation(
        res,
        async () => this.daemon.getStatus()
      );
    });

    // Job management
    this.app.get('/api/jobs', async (req, res) => {
      await this.handleOperation(
        res,
        async () => {
          const { filter, limit } = req.query;
          return this.daemon.listJobs(
            filter ? JSON.parse(filter as string) : undefined,
            limit ? parseInt(limit as string) : undefined
          );
        }
      );
    });

    this.app.post('/api/jobs', async (req, res) => {
      await this.handleOperation(
        res,
        async () => this.daemon.addJob(req.body),
        201,
        'job.created'
      );
    });

    this.app.get('/api/jobs/:id', (req, res) => {
      const job = this.daemon.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      res.json(job);
    });

    this.app.post('/api/jobs/:id/start', async (req, res) => {
      await this.handleOperation(
        res,
        async () => this.daemon.startJob(req.params.id),
        200,
        'job.started'
      );
    });

    this.app.post('/api/jobs/:id/stop', async (req, res) => {
      await this.handleOperation(
        res,
        async () => {
          const { signal } = req.body;
          return this.daemon.stopJob(req.params.id, signal);
        },
        200,
        'job.stopped'
      );
    });

    this.app.post('/api/jobs/:id/trigger', async (req, res) => {
      await this.handleOperation(
        res,
        async () => this.daemon.triggerJob(req.params.id)
      );
    });

    this.app.delete('/api/jobs/:id', async (req, res) => {
      await this.handleOperation(
        res,
        async () => {
          const force = req.query.force === 'true';
          const success = await this.daemon.removeJob(req.params.id, force);
          if (!success) {
            throw new Error('Failed to remove job');
          }
          return { id: req.params.id };
        },
        204,
        'job.removed'
      );
    });

    // Bulk operations
    this.app.post('/api/jobs/bulk', async (req, res) => {
      const { jobs } = req.body;
      if (!Array.isArray(jobs)) {
        return res.status(400).json({ error: 'Jobs must be an array' });
      }

      const results: Array<{ success: boolean; job?: unknown; error?: string; jobSpec?: unknown }> = [];
      for (const jobSpec of jobs) {
        try {
          const job = await this.daemon.addJob(jobSpec);
          results.push({ success: true, job });
        } catch (error) {
          const err = error as Error;
          results.push({ success: false, error: err.message, jobSpec });
        }
      }

      res.json({ results });
    });

    // Server-sent events for real-time updates
    this.app.get('/api/events', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Disable nginx buffering
      });

      // Send initial ping
      res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

      // Add client to set
      this.clients.add(res);

      // Setup heartbeat
      const heartbeat = setInterval(() => {
        res.write(`:ping\n\n`);
      }, 30000);

      // Cleanup on disconnect
      req.on('close', () => {
        clearInterval(heartbeat);
        this.clients.delete(res);
      });
    });

    // Webhook management
    this.app.get('/api/webhooks', (req, res) => {
      res.json({
        enabled: this.apiConfig.enableWebhooks,
        endpoints: this.apiConfig.webhookEndpoints
      });
    });

    this.app.post('/api/webhooks', (req, res) => {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint URL required' });
      }

      if (!this.apiConfig.webhookEndpoints?.includes(endpoint)) {
        this.apiConfig.webhookEndpoints?.push(endpoint);
      }

      res.json({ success: true, endpoints: this.apiConfig.webhookEndpoints });
    });

    // Data export endpoints for integration
    this.app.get('/api/export/jobs', async (req, res) => {
      const jobs = await this.daemon.listJobs();
      const format = req.query.format || 'json';

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="jobs.csv"');

        const csv = this.convertToCSV(jobs);
        res.send(csv);
      } else {
        res.json(jobs);
      }
    });

    // Supabase integration endpoint
    this.app.post('/api/supabase/sync', async (req, res) => {
      await this.handleOperation(
        res,
        async () => {
          // This endpoint can be called by Supabase jobs to sync data
          const { table, operation, data } = req.body;

          // Emit event for mcli listener
          this.emit('supabase:sync', { table, operation, data });

          // Broadcast to SSE clients
          this.broadcastToClients({
            type: 'supabase:sync',
            table,
            operation,
            data,
            timestamp: Date.now()
          });

          return { success: true, message: 'Data synced' };
        }
      );
    });
  }

  private setupEventHandlers() {
    // Listen to daemon events and broadcast to SSE clients
    const events = ['job:started', 'job:completed', 'job:failed', 'job:stopped'];

    events.forEach(event => {
      this.daemon.on(event, (data) => {
        this.broadcastToClients({
          type: event,
          data,
          timestamp: Date.now()
        });

        if (this.apiConfig.enableWebhooks) {
          this.triggerWebhook(event, data);
        }
      });
    });
  }

  private broadcastToClients(data: unknown) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach(client => {
      client.write(message);
    });
  }

  private async triggerWebhook(event: string, data: unknown) {
    if (!this.apiConfig.webhookEndpoints?.length) return;

    const payload = {
      event,
      data,
      timestamp: Date.now(),
      source: 'lsh-daemon'
    };

    for (const endpoint of this.apiConfig.webhookEndpoints) {
      try {
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-LSH-Event': event
          },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        this.logger.error(`Webhook failed for ${endpoint}`, error as Error);
      }
    }
  }

  private convertToCSV(data: Record<string, unknown>[]): string {
    if (!data.length) return '';

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',')
            ? `"${value}"`
            : value;
        }).join(',')
      )
    ];

    return csv.join('\n');
  }

  /**
   * Override onStop to cleanup SSE connections
   */
  protected onStop(): void {
    // Close all SSE connections
    this.clients.forEach(client => client.end());
    this.clients.clear();
  }

  /**
   * Override start to log API key
   */
  public async start(): Promise<void> {
    await super.start();
    this.logger.info(`API Key: ${this.apiConfig.apiKey}`);
  }

  getApiKey(): string {
    return this.apiConfig.apiKey!;
  }
}