/**
 * LSH API Server - RESTful API for daemon control and job management
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { EventEmitter } from 'events';
import crypto from 'crypto';
import type { LSHJobDaemon } from './lshd.js';
import type { JobSpec as _JobSpec } from '../lib/job-manager.js';

export interface ApiConfig {
  port: number;
  apiKey?: string;
  jwtSecret?: string;
  corsOrigins?: string[];
  enableWebhooks?: boolean;
  webhookEndpoints?: string[];
}

export class LSHApiServer extends EventEmitter {
  private app: express.Application;
  private daemon: LSHJobDaemon;
  private config: ApiConfig;
  private server: any;
  private clients = new Set<Response>(); // SSE clients

  constructor(daemon: LSHJobDaemon, config: Partial<ApiConfig> = {}) {
    super();
    this.daemon = daemon;
    this.config = {
      port: 3030,
      apiKey: process.env.LSH_API_KEY || crypto.randomBytes(32).toString('hex'),
      jwtSecret: process.env.LSH_JWT_SECRET || crypto.randomBytes(32).toString('hex'),
      corsOrigins: ['http://localhost:*'],
      enableWebhooks: false,
      webhookEndpoints: [],
      ...config
    };

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      crossOriginEmbedderPolicy: false,
    }));

    // CORS
    this.app.use(cors({
      origin: (origin, callback) => {
        if (!origin || this.config.corsOrigins?.some(pattern => {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(origin);
        })) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`[API] ${new Date().toISOString()} ${req.method} ${req.path}`);
      next();
    });
  }

  private authenticateRequest(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];

    // Check API key
    if (apiKey && apiKey === this.config.apiKey) {
      return next();
    }

    // Check JWT token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        jwt.verify(token, this.config.jwtSecret!);
        return next();
      } catch (_err) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    return res.status(401).json({ error: 'Authentication required' });
  }

  private setupRoutes() {
    // Health check (no auth)
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Generate JWT token
    this.app.post('/api/auth', (req, res) => {
      const { apiKey } = req.body;
      if (apiKey === this.config.apiKey) {
        const token = jwt.sign(
          { type: 'api-access', created: Date.now() },
          this.config.jwtSecret!,
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
      try {
        const status = await this.daemon.getStatus();
        res.json(status);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });

    // Job management
    this.app.get('/api/jobs', (req, res) => {
      try {
        const { filter, limit } = req.query;
        const jobs = this.daemon.listJobs(
          filter ? JSON.parse(filter as string) : undefined,
          limit ? parseInt(limit as string) : undefined
        );
        res.json(jobs);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.post('/api/jobs', async (req, res) => {
      try {
        const job = await this.daemon.addJob(req.body);
        res.status(201).json(job);

        // Trigger webhook if enabled
        if (this.config.enableWebhooks) {
          this.triggerWebhook('job.created', job);
        }
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.get('/api/jobs/:id', (req, res) => {
      const job = this.daemon.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      res.json(job);
    });

    this.app.post('/api/jobs/:id/start', async (req, res) => {
      try {
        const job = await this.daemon.startJob(req.params.id);
        res.json(job);

        if (this.config.enableWebhooks) {
          this.triggerWebhook('job.started', job);
        }
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.post('/api/jobs/:id/stop', async (req, res) => {
      try {
        const { signal } = req.body;
        const job = await this.daemon.stopJob(req.params.id, signal);
        res.json(job);

        if (this.config.enableWebhooks) {
          this.triggerWebhook('job.stopped', job);
        }
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.post('/api/jobs/:id/trigger', async (req, res) => {
      try {
        const result = await this.daemon.triggerJob(req.params.id);
        res.json(result);
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    this.app.delete('/api/jobs/:id', async (req, res) => {
      try {
        const force = req.query.force === 'true';
        const success = await this.daemon.removeJob(req.params.id, force);
        if (success) {
          res.status(204).send();

          if (this.config.enableWebhooks) {
            this.triggerWebhook('job.removed', { id: req.params.id });
          }
        } else {
          res.status(400).json({ error: 'Failed to remove job' });
        }
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });

    // Bulk operations
    this.app.post('/api/jobs/bulk', async (req, res) => {
      const { jobs } = req.body;
      if (!Array.isArray(jobs)) {
        return res.status(400).json({ error: 'Jobs must be an array' });
      }

      const results = [];
      for (const jobSpec of jobs) {
        try {
          const job = await this.daemon.addJob(jobSpec);
          results.push({ success: true, job });
        } catch (error: any) {
          results.push({ success: false, error: error.message, jobSpec });
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
        enabled: this.config.enableWebhooks,
        endpoints: this.config.webhookEndpoints
      });
    });

    this.app.post('/api/webhooks', (req, res) => {
      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint URL required' });
      }

      if (!this.config.webhookEndpoints?.includes(endpoint)) {
        this.config.webhookEndpoints?.push(endpoint);
      }

      res.json({ success: true, endpoints: this.config.webhookEndpoints });
    });

    // Data export endpoints for integration
    this.app.get('/api/export/jobs', (req, res) => {
      const jobs = this.daemon.listJobs();
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
      try {
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

        res.json({ success: true, message: 'Data synced' });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
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

        if (this.config.enableWebhooks) {
          this.triggerWebhook(event, data);
        }
      });
    });
  }

  private broadcastToClients(data: any) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach(client => {
      client.write(message);
    });
  }

  private async triggerWebhook(event: string, data: any) {
    if (!this.config.webhookEndpoints?.length) return;

    const payload = {
      event,
      data,
      timestamp: Date.now(),
      source: 'lsh-daemon'
    };

    for (const endpoint of this.config.webhookEndpoints) {
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
        console.error(`Webhook failed for ${endpoint}:`, error);
      }
    }
  }

  private convertToCSV(data: any[]): string {
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

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.port, () => {
        console.log(`LSH API Server running on port ${this.config.port}`);
        console.log(`API Key: ${this.config.apiKey}`);
        resolve();
      }).on('error', reject);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        // Close all SSE connections
        this.clients.forEach(client => client.end());
        this.clients.clear();

        this.server.close(() => {
          console.log('API Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getApiKey(): string {
    return this.config.apiKey!;
  }

  getPort(): number {
    return this.config.port;
  }
}