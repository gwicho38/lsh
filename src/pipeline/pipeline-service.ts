import express, { Request, Response, Router } from 'express';
import { Pool } from 'pg';
import { JobTracker, PipelineJob, JobStatus, JobPriority } from './job-tracker.js';
import { MCLIBridge } from './mcli-bridge.js';
import { Server } from 'socket.io';
import { createServer } from 'http';

export interface PipelineServiceConfig {
  port?: number;
  databaseUrl?: string;
  mcliUrl?: string;
  mcliApiKey?: string;
  webhookBaseUrl?: string;
}

export class PipelineService {
  private app: express.Application;
  private server: any;
  private io: Server;
  private pool: Pool;
  private jobTracker: JobTracker;
  private mcliBridge: MCLIBridge;
  private config: PipelineServiceConfig;

  constructor(config: PipelineServiceConfig = {}) {
    this.config = {
      port: config.port || 3034,
      databaseUrl: config.databaseUrl || process.env.DATABASE_URL || 'postgresql://localhost:5432/pipeline',
      mcliUrl: config.mcliUrl || process.env.MCLI_URL || 'http://localhost:8000',
      mcliApiKey: config.mcliApiKey || process.env.MCLI_API_KEY,
      webhookBaseUrl: config.webhookBaseUrl || `http://localhost:${config.port || 3034}`
    };

    // Initialize database pool
    this.pool = new Pool({
      connectionString: this.config.databaseUrl
    });

    // Initialize services
    this.jobTracker = new JobTracker(this.pool);
    this.mcliBridge = new MCLIBridge(
      {
        baseUrl: this.config.mcliUrl!,
        apiKey: this.config.mcliApiKey,
        webhookUrl: this.config.webhookBaseUrl
      },
      this.jobTracker
    );

    // Initialize Express app
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupEventListeners();
  }

  private setupMiddleware() {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes() {
    const router = Router();

    // Health check
    router.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: this.pool ? 'connected' : 'disconnected',
          mcli: 'configured',
          jobTracker: 'active'
        }
      });
    });

    // Job Management Routes
    router.post('/api/pipeline/jobs', async (req: Request, res: Response) => {
      try {
        const job: PipelineJob = req.body;
        const createdJob = await this.jobTracker.createJob(job);
        res.status(201).json(createdJob);
      } catch (error) {
        console.error('Error creating job:', error);
        res.status(500).json({ error: 'Failed to create job' });
      }
    });

    router.get('/api/pipeline/jobs', async (req: Request, res: Response) => {
      try {
        const filters = {
          status: req.query.status as JobStatus,
          sourceSystem: req.query.sourceSystem as string,
          targetSystem: req.query.targetSystem as string,
          owner: req.query.owner as string,
          team: req.query.team as string,
          limit: parseInt(req.query.limit as string) || 50,
          offset: parseInt(req.query.offset as string) || 0
        };

        const result = await this.jobTracker.listJobs(filters);
        res.json(result);
      } catch (error) {
        console.error('Error listing jobs:', error);
        res.status(500).json({ error: 'Failed to list jobs' });
      }
    });

    router.get('/api/pipeline/jobs/:id', async (req: Request, res: Response) => {
      try {
        const job = await this.jobTracker.getJob(req.params.id);
        if (!job) {
          return res.status(404).json({ error: 'Job not found' });
        }
        res.json(job);
      } catch (error) {
        console.error('Error getting job:', error);
        res.status(500).json({ error: 'Failed to get job' });
      }
    });

    router.put('/api/pipeline/jobs/:id/cancel', async (req: Request, res: Response) => {
      try {
        const job = await this.jobTracker.getJob(req.params.id);
        if (!job) {
          return res.status(404).json({ error: 'Job not found' });
        }

        await this.jobTracker.updateJobStatus(req.params.id, JobStatus.CANCELLED);

        // Cancel in MCLI if applicable
        if (job.externalId && job.targetSystem === 'mcli') {
          await this.mcliBridge.cancelJob(job.externalId);
        }

        res.json({ message: 'Job cancelled successfully' });
      } catch (error) {
        console.error('Error cancelling job:', error);
        res.status(500).json({ error: 'Failed to cancel job' });
      }
    });

    router.put('/api/pipeline/jobs/:id/retry', async (req: Request, res: Response) => {
      try {
        const job = await this.jobTracker.getJob(req.params.id);
        if (!job) {
          return res.status(404).json({ error: 'Job not found' });
        }

        // Create new execution for retry
        const execution = await this.jobTracker.createExecution(req.params.id);

        // If MCLI job, resubmit
        if (job.targetSystem === 'mcli') {
          await this.mcliBridge.submitJobToMCLI(job);
        }

        res.json({ message: 'Job retry initiated', executionId: execution.id });
      } catch (error) {
        console.error('Error retrying job:', error);
        res.status(500).json({ error: 'Failed to retry job' });
      }
    });

    // Job Metrics
    router.get('/api/pipeline/jobs/:id/metrics', async (req: Request, res: Response) => {
      try {
        const metrics = await this.jobTracker.getJobMetrics(
          req.params.id,
          req.query.metricName as string
        );
        res.json(metrics);
      } catch (error) {
        console.error('Error getting job metrics:', error);
        res.status(500).json({ error: 'Failed to get job metrics' });
      }
    });

    // Active Jobs
    router.get('/api/pipeline/jobs/active', async (req: Request, res: Response) => {
      try {
        const jobs = await this.jobTracker.getActiveJobs();
        res.json(jobs);
      } catch (error) {
        console.error('Error getting active jobs:', error);
        res.status(500).json({ error: 'Failed to get active jobs' });
      }
    });

    // Success Rates
    router.get('/api/pipeline/metrics/success-rates', async (req: Request, res: Response) => {
      try {
        const rates = await this.jobTracker.getJobSuccessRates();
        res.json(rates);
      } catch (error) {
        console.error('Error getting success rates:', error);
        res.status(500).json({ error: 'Failed to get success rates' });
      }
    });

    // MCLI Webhook endpoint
    router.post('/webhook/mcli', async (req: Request, res: Response) => {
      try {
        await this.mcliBridge.handleWebhook(req.body);
        res.json({ success: true });
      } catch (error) {
        console.error('Error handling MCLI webhook:', error);
        res.status(500).json({ error: 'Failed to handle webhook' });
      }
    });

    // MCLI Status Sync
    router.post('/api/pipeline/sync/mcli/:jobId', async (req: Request, res: Response) => {
      try {
        await this.mcliBridge.syncJobStatus(req.params.jobId);
        res.json({ message: 'Job synced successfully' });
      } catch (error) {
        console.error('Error syncing job:', error);
        res.status(500).json({ error: 'Failed to sync job' });
      }
    });

    // MCLI Health Check
    router.get('/api/pipeline/mcli/health', async (req: Request, res: Response) => {
      try {
        const isHealthy = await this.mcliBridge.healthCheck();
        res.json({ healthy: isHealthy });
      } catch (error) {
        console.error('Error checking MCLI health:', error);
        res.status(500).json({ error: 'Failed to check MCLI health' });
      }
    });

    // MCLI Statistics
    router.get('/api/pipeline/mcli/statistics', async (req: Request, res: Response) => {
      try {
        const stats = await this.mcliBridge.getStatistics();
        res.json(stats);
      } catch (error) {
        console.error('Error getting MCLI statistics:', error);
        res.status(500).json({ error: 'Failed to get MCLI statistics' });
      }
    });

    // Pipeline Statistics
    router.get('/api/pipeline/statistics', async (req: Request, res: Response) => {
      try {
        const query = `
          SELECT
            COUNT(DISTINCT j.id) as total_jobs,
            COUNT(DISTINCT e.id) as total_executions,
            COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'completed') as completed_jobs,
            COUNT(DISTINCT j.id) FILTER (WHERE j.status = 'failed') as failed_jobs,
            COUNT(DISTINCT j.id) FILTER (WHERE j.status IN ('running', 'queued')) as active_jobs,
            AVG(e.duration_ms) as avg_duration_ms,
            MAX(e.duration_ms) as max_duration_ms,
            MIN(e.duration_ms) FILTER (WHERE e.duration_ms > 0) as min_duration_ms
          FROM pipeline_jobs j
          LEFT JOIN job_executions e ON j.id = e.job_id
          WHERE j.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
        `;

        const result = await this.pool.query(query);
        res.json(result.rows[0]);
      } catch (error) {
        console.error('Error getting pipeline statistics:', error);
        res.status(500).json({ error: 'Failed to get pipeline statistics' });
      }
    });

    // Recent Events
    router.get('/api/pipeline/events', async (req: Request, res: Response) => {
      try {
        const limit = parseInt(req.query.limit as string) || 100;
        const query = `
          SELECT * FROM pipeline_events
          ORDER BY occurred_at DESC
          LIMIT $1
        `;

        const result = await this.pool.query(query, [limit]);
        res.json(result.rows);
      } catch (error) {
        console.error('Error getting events:', error);
        res.status(500).json({ error: 'Failed to get events' });
      }
    });

    this.app.use('/', router);
  }

  private setupWebSocket() {
    this.io.on('connection', (socket) => {
      console.log(`WebSocket client connected: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`WebSocket client disconnected: ${socket.id}`);
      });

      socket.on('subscribe:job', (jobId: string) => {
        socket.join(`job:${jobId}`);
        console.log(`Client ${socket.id} subscribed to job ${jobId}`);
      });

      socket.on('unsubscribe:job', (jobId: string) => {
        socket.leave(`job:${jobId}`);
        console.log(`Client ${socket.id} unsubscribed from job ${jobId}`);
      });
    });
  }

  private setupEventListeners() {
    // Job Tracker events
    this.jobTracker.on('job:created', (event) => {
      this.io.emit('job:created', event);
      this.io.to(`job:${event.jobId}`).emit('job:update', event);
    });

    this.jobTracker.on('job:status_changed', (event) => {
      this.io.emit('job:status_changed', event);
      this.io.to(`job:${event.jobId}`).emit('job:update', event);
    });

    this.jobTracker.on('execution:started', (event) => {
      this.io.to(`job:${event.jobId}`).emit('execution:started', event);
    });

    this.jobTracker.on('execution:completed', (event) => {
      this.io.to(`job:${event.jobId}`).emit('execution:completed', event);
    });

    this.jobTracker.on('execution:failed', (event) => {
      this.io.to(`job:${event.jobId}`).emit('execution:failed', event);
    });

    // MCLI Bridge events
    this.mcliBridge.on('mcli:submitted', (event) => {
      this.io.emit('mcli:submitted', event);
      if (event.pipelineJobId) {
        this.io.to(`job:${event.pipelineJobId}`).emit('mcli:submitted', event);
      }
    });

    this.mcliBridge.on('mcli:webhook', (event) => {
      this.io.emit('mcli:webhook', event);
      if (event.pipelineJobId) {
        this.io.to(`job:${event.pipelineJobId}`).emit('mcli:update', event);
      }
    });
  }

  async start(): Promise<void> {
    try {
      // Test database connection
      await this.pool.query('SELECT 1');
      console.log('✅ Database connected');

      // Start job tracker polling
      this.jobTracker.startPolling();
      console.log('✅ Job tracker started');

      // Start MCLI periodic sync
      this.mcliBridge.startPeriodicSync();
      console.log('✅ MCLI bridge started');

      // Start server
      this.server.listen(this.config.port, () => {
        console.log(`🚀 Pipeline service running on port ${this.config.port}`);
        console.log(`📊 API available at http://localhost:${this.config.port}/api/pipeline`);
        console.log(`🔄 WebSocket available at ws://localhost:${this.config.port}`);
        console.log(`🪝 Webhook endpoint at http://localhost:${this.config.port}/webhook/mcli`);
      });
    } catch (error) {
      console.error('Failed to start pipeline service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('Shutting down pipeline service...');

    // Stop polling
    this.jobTracker.stopPolling();

    // Cleanup services
    await this.jobTracker.cleanup();
    this.mcliBridge.cleanup();

    // Close database pool
    await this.pool.end();

    // Close server
    this.server.close();

    console.log('Pipeline service stopped');
  }
}

// Export for CLI usage
export async function startPipelineService(config?: PipelineServiceConfig): Promise<PipelineService> {
  const service = new PipelineService(config);
  await service.start();
  return service;
}

// Handle process termination
if (import.meta.url === `file://${process.argv[1]}`) {
  const service = new PipelineService();

  process.on('SIGINT', async () => {
    await service.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await service.stop();
    process.exit(0);
  });

  service.start().catch((error) => {
    console.error('Failed to start:', error);
    process.exit(1);
  });
}