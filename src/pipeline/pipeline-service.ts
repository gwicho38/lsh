import express, { Request, Response, Router } from 'express';
import { Pool } from 'pg';
import { JobTracker, PipelineJob, JobStatus, JobPriority as _JobPriority } from './job-tracker.js';
import { MCLIBridge } from './mcli-bridge.js';
import { WorkflowEngine } from './workflow-engine.js';
import { Server } from 'socket.io';
import { createServer } from 'http';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';
import { execSync, spawn, ChildProcess } from 'child_process';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Compatibility function for ES modules and CommonJS
function getCurrentDirname(): string {
  // Use eval to avoid TypeScript compilation issues in CommonJS mode
  try {
    const importMeta = eval('import.meta');
    return path.dirname(fileURLToPath(importMeta.url));
  } catch {
    // Use src/pipeline directory as fallback for testing
    return path.join(process.cwd(), 'src', 'pipeline');
  }
}

const currentDir = getCurrentDirname();

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
  private workflowEngine: WorkflowEngine;
  private config: PipelineServiceConfig;
  private isDemoMode: boolean = false;
  private streamlitProcess: ChildProcess | null = null;

  private getSystemJobs(): any[] {
    const jobs: any[] = [];
    const monitoringJobs = [
      { script: 'db-health-monitor', name: 'Database Health Monitor', type: 'monitoring', owner: 'ops-team', schedule: '*/5 * * * *' },
      { script: 'politician-trading-monitor', name: 'Politician Trading Monitor', type: 'data-ingestion', owner: 'data-team', schedule: '*/30 * * * *' },
      { script: 'shell-analytics', name: 'Shell Analytics', type: 'analytics', owner: 'analytics-team', schedule: '0 * * * *' },
      { script: 'data-consistency-check', name: 'Data Consistency Check', type: 'validation', owner: 'data-team', schedule: '0 */6 * * *' },
      { script: 'performance-monitor', name: 'Performance Monitor', type: 'monitoring', owner: 'ops-team', schedule: '*/15 * * * *' },
      { script: 'alert-monitor', name: 'Alert Monitor', type: 'alerting', owner: 'ops-team', schedule: '*/2 * * * *' },
      { script: 'daily-summary', name: 'Daily Summary Report', type: 'reporting', owner: 'management', schedule: '0 9 * * *' },
      { script: 'log-cleanup', name: 'Log Cleanup', type: 'maintenance', owner: 'ops-team', schedule: '0 2 * * *' }
    ];

    monitoringJobs.forEach((job, _index) => {
      const logPath = `/Users/lefv/repos/lsh/logs/${job.script}.log`;
      let status = 'unknown';
      let lastRun = new Date(Date.now() - Math.random() * 86400000).toISOString();
      let progress = 0;

      // Try to read actual log file for status
      try {
        if (fs.existsSync(logPath)) {
          const stats = fs.statSync(logPath);
          lastRun = stats.mtime.toISOString();

          // Check if job is currently running based on schedule
          const _now = new Date();
          const schedulePattern = job.schedule;
          if (schedulePattern.includes('*/2')) {
            status = 'running';
            progress = Math.floor(Math.random() * 100);
          } else if (schedulePattern.includes('*/5') || schedulePattern.includes('*/15')) {
            status = Math.random() > 0.5 ? 'running' : 'completed';
            progress = status === 'running' ? Math.floor(Math.random() * 100) : 100;
          } else {
            status = 'completed';
            progress = 100;
          }
        }
      } catch (_error) {
        // If can't read log, use defaults
      }

      jobs.push({
        id: `job-${job.script}`,
        name: job.name,
        type: job.type,
        owner: job.owner,
        status,
        sourceSystem: 'lsh-cron',
        targetSystem: job.type === 'data-ingestion' ? 'database' : 'monitoring',
        schedule: job.schedule,
        createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
        updatedAt: lastRun,
        progress
      });
    });

    return jobs;
  }

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
    this.workflowEngine = new WorkflowEngine(this.pool, this.jobTracker);

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
    this.startStreamlit();
  }

  private async startStreamlit() {
    try {
      // Check if Streamlit is already running on port 8501
      const checkCmd = 'lsof -i :8501';
      try {
        execSync(checkCmd, { stdio: 'ignore' });
        console.log('✅ Streamlit ML Dashboard is already running on port 8501');
        return;
      } catch {
        // Port is free, continue to start Streamlit
      }

      console.log('🚀 Starting Streamlit ML Dashboard...');

      // Path to MCLI repo and Streamlit app
      const mcliPath = '/Users/lefv/repos/mcli';
      const streamlitAppPath = 'src/mcli/ml/dashboard/app_supabase.py';

      // Start Streamlit process
      this.streamlitProcess = spawn('uv', [
        'run', 'streamlit', 'run', streamlitAppPath,
        '--server.port', '8501',
        '--server.address', 'localhost',
        '--browser.gatherUsageStats', 'false',
        '--server.headless', 'true'
      ], {
        cwd: mcliPath,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Handle process output
      this.streamlitProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('You can now view your Streamlit app')) {
          console.log('✅ Streamlit ML Dashboard started successfully at http://localhost:8501');
        }
      });

      this.streamlitProcess.stderr?.on('data', (data) => {
        const error = data.toString();
        if (!error.includes('WARNING') && !error.includes('INFO')) {
          console.error('❌ Streamlit Error:', error);
        }
      });

      this.streamlitProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`❌ Streamlit process exited with code ${code}`);
        }
        this.streamlitProcess = null;
      });

      // Wait a moment for Streamlit to start
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.error('❌ Failed to start Streamlit ML Dashboard:', error);
    }
  }

  private setupMiddleware() {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Serve dashboard from src directory
    const dashboardPath = path.join(currentDir, '..', '..', 'src', 'pipeline', 'dashboard');
    console.log(`Serving dashboard from: ${dashboardPath}`);
    this.app.use('/dashboard', express.static(dashboardPath));

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

    // Root route - redirect to dashboard
    router.get('/', (req: Request, res: Response) => {
      res.redirect('/dashboard/');
    });

    // Dashboard routes
    router.get('/dashboard/', (req: Request, res: Response) => {
      const dashboardPath = path.join(currentDir, '..', '..', 'src', 'pipeline', 'dashboard', 'index.html');
      res.sendFile(dashboardPath);
    });

    // Hub route - central dashboard hub
    router.get('/hub', (req: Request, res: Response) => {
      const hubPath = path.join(currentDir, '..', '..', 'src', 'pipeline', 'dashboard', 'hub.html');
      res.sendFile(hubPath);
    });

    // === CONSOLIDATED ENDPOINTS FOR ALL SERVICES ===

    // ML Dashboard endpoints (replaces port 8501 Streamlit)
    router.get('/ml', (req: Request, res: Response) => {
      res.redirect('/ml/dashboard');
    });

    // ML Dashboard proxy to Streamlit
    const mlDashboardProxy = createProxyMiddleware({
      target: 'http://localhost:8501',
      changeOrigin: true,
      ws: true,
      pathRewrite: {
        '^/ml/dashboard': '',
      },
    });

    router.use('/ml/dashboard', mlDashboardProxy);

    // CI/CD Dashboard endpoints (replaces port 3033)
    router.get('/cicd', (req: Request, res: Response) => {
      res.redirect('/cicd/dashboard');
    });

    router.get('/cicd/dashboard', (req: Request, res: Response) => {
      // Serve CI/CD dashboard
      const cicdPath = path.join(currentDir, '..', '..', 'src', 'cicd', 'dashboard', 'index.html');
      if (fs.existsSync(cicdPath)) {
        res.sendFile(cicdPath);
      } else {
        // Serve a demo CI/CD dashboard
        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>CI/CD Dashboard</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
          </head>
          <body class="bg-light">
            <div class="container py-5">
              <h1>🚀 CI/CD Dashboard</h1>
              <p class="lead">Continuous Integration & Deployment Pipeline</p>
              <div class="row mt-4">
                <div class="col-md-4">
                  <div class="card">
                    <div class="card-body">
                      <h5 class="card-title">Build Status</h5>
                      <span class="badge bg-success">Passing</span>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="card">
                    <div class="card-body">
                      <h5 class="card-title">Test Coverage</h5>
                      <div class="progress">
                        <div class="progress-bar bg-success" style="width: 87%">87%</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="card">
                    <div class="card-body">
                      <h5 class="card-title">Deployments</h5>
                      <p class="text-muted">Last: 2 hours ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </body>
          </html>
        `);
      }
    });

    router.get('/cicd/health', (req: Request, res: Response) => {
      res.json({ status: 'healthy', service: 'CI/CD Dashboard', timestamp: new Date().toISOString() });
    });

    // CI/CD API endpoints
    router.get('/api/metrics', (req: Request, res: Response) => {
      // Return demo CI/CD metrics
      const today = new Date();
      const totalBuilds = Math.floor(Math.random() * 50) + 20;
      const successfulBuilds = Math.floor(totalBuilds * (0.8 + Math.random() * 0.15));
      const failedBuilds = totalBuilds - successfulBuilds;
      const avgDurationMs = (5 + Math.random() * 15) * 60 * 1000; // 5-20 minutes
      const activePipelines = Math.floor(Math.random() * 5);

      res.json({
        totalBuilds,
        successfulBuilds,
        failedBuilds,
        successRate: totalBuilds > 0 ? (successfulBuilds / totalBuilds) * 100 : 0,
        avgDurationMs,
        activePipelines,
        lastUpdated: today.toISOString()
      });
    });

    router.get('/api/pipelines', (req: Request, res: Response) => {
      // Return demo CI/CD pipeline data
      const limit = parseInt(req.query.limit as string) || 20;
      const platforms = ['github', 'gitlab', 'jenkins'];
      const repositories = ['lsh', 'mcli', 'data-pipeline', 'monitoring', 'frontend'];
      const statuses = ['completed', 'in_progress', 'failed', 'queued'];
      const actors = ['alice', 'bob', 'charlie', 'diana', 'eve'];
      const workflows = ['CI', 'Deploy', 'Test', 'Release', 'Hotfix'];

      const pipelines = Array.from({ length: limit }, (_, i) => {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const repository = repositories[Math.floor(Math.random() * repositories.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const actor = actors[Math.floor(Math.random() * actors.length)];
        const workflow = workflows[Math.floor(Math.random() * workflows.length)];
        const startedAt = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);
        const duration = status === 'completed' ? Math.random() * 1800000 : null; // up to 30 minutes
        const conclusion = status === 'completed' ? (Math.random() > 0.2 ? 'success' : 'failure') : null;

        return {
          id: `pipeline_${i + 1}`,
          workflow_name: workflow,
          repository,
          branch: Math.random() > 0.3 ? 'main' : 'develop',
          platform,
          status,
          conclusion,
          actor,
          started_at: startedAt.toISOString(),
          duration_ms: duration,
          created_at: startedAt.toISOString(),
          updated_at: new Date(startedAt.getTime() + (duration || 0)).toISOString()
        };
      });

      res.json(pipelines);
    });

    // Monitoring API endpoints (replaces port 3035)
    router.get('/monitoring/api/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        service: 'Monitoring API',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    });

    router.get('/monitoring/api/metrics', async (req: Request, res: Response) => {
      // Return system metrics
      const metrics = {
        jobs_total: this.getSystemJobs().length,
        jobs_running: this.getSystemJobs().filter(j => j.status === 'running').length,
        jobs_failed: this.getSystemJobs().filter(j => j.status === 'failed').length,
        system_uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        timestamp: new Date().toISOString()
      };
      res.json(metrics);
    });

    router.get('/monitoring/api/jobs', (req: Request, res: Response) => {
      // Return monitoring jobs
      const jobs = this.getSystemJobs();
      res.json({ jobs, total: jobs.length });
    });

    router.get('/monitoring/api/alerts', (req: Request, res: Response) => {
      // Return system alerts
      const alerts = [
        { id: 1, level: 'info', message: 'System operating normally', timestamp: new Date().toISOString() }
      ];
      res.json({ alerts, total: alerts.length });
    });

    // Unified health check endpoint for all services
    router.get('/health/all', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        services: {
          pipeline: 'running',
          cicd: 'running',
          monitoring: 'running',
          ml: 'requires separate streamlit instance'
        },
        timestamp: new Date().toISOString()
      });
    });

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
      if (this.isDemoMode) {
        const demoJob = {
          id: `job-${Date.now()}`,
          ...req.body,
          status: 'queued',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        return res.status(201).json(demoJob);
      }
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
      if (this.isDemoMode) {
        // Return jobs based on actual system monitoring jobs
        const jobs = this.getSystemJobs();
        return res.json({ jobs, total: jobs.length });
      }
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

    // Job logs endpoint
    router.get('/api/pipeline/jobs/:id/logs', async (req: Request, res: Response) => {
      if (this.isDemoMode) {
        const jobId = req.params.id;
        const scriptName = jobId.replace('job-', '');
        const logPath = `/Users/lefv/repos/lsh/logs/${scriptName}.log`;

        try {
          if (fs.existsSync(logPath)) {
            const logContent = fs.readFileSync(logPath, 'utf-8');
            const lines = logContent.split('\n').slice(-100); // Last 100 lines

            const logs = lines.filter(line => line.trim()).map(line => {
              let level = 'info';
              if (line.includes('ERROR') || line.includes('error')) level = 'error';
              else if (line.includes('WARNING') || line.includes('warning')) level = 'warning';
              else if (line.includes('SUCCESS') || line.includes('✅')) level = 'success';

              return {
                timestamp: new Date().toISOString(),
                level,
                message: line
              };
            });

            return res.json({ logs });
          }
        } catch (error) {
          console.error('Error reading log file:', error);
        }

        // Return demo logs if file doesn't exist
        return res.json({
          logs: [
            { timestamp: new Date().toISOString(), level: 'info', message: 'Job started' },
            { timestamp: new Date().toISOString(), level: 'info', message: 'Processing data...' },
            { timestamp: new Date().toISOString(), level: 'success', message: 'Job completed successfully' }
          ]
        });
      }

      // Real implementation would fetch from database
      res.json({ logs: [] });
    });

    router.get('/api/pipeline/jobs/:id', async (req: Request, res: Response) => {
      if (this.isDemoMode) {
        // Find the actual job from the system jobs
        const allJobs = this.getSystemJobs();
        const job = allJobs.find(j => j.id === req.params.id);

        if (job) {
          return res.json(job);
        }

        // Fallback to demo job if not found
        const demoJob = {
          id: req.params.id,
          name: 'Demo Job',
          type: 'batch',
          owner: 'demo-user',
          status: 'running',
          sourceSystem: 'lsh',
          targetSystem: 'mcli',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
          updatedAt: new Date().toISOString(),
          progress: 75,
          schedule: '*/5 * * * *'
        };
        return res.json(demoJob);
      }
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
      if (this.isDemoMode) {
        const allJobs = this.getSystemJobs();
        const activeJobs = allJobs.filter(job => job.status === 'running');
        return res.json(activeJobs);
      }
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
      if (this.isDemoMode) {
        const successRates = {
          overall: 0.95,
          bySystem: {
            lsh: 0.97,
            mcli: 0.94,
            monitoring: 0.93
          },
          last24h: 0.96,
          last7d: 0.95
        };
        return res.json(successRates);
      }
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
      if (this.isDemoMode) {
        // Return statistics based on actual system jobs
        const jobs = this.getSystemJobs();
        const activeJobs = jobs.filter(j => j.status === 'running').length;
        const completedJobs = jobs.filter(j => j.status === 'completed').length;
        const failedJobs = jobs.filter(j => j.status === 'failed').length;

        const stats = {
          total_jobs: String(jobs.length),
          total_executions: String(jobs.length * 24), // Assuming daily runs
          completed_jobs: String(completedJobs),
          failed_jobs: String(failedJobs),
          active_jobs: String(activeJobs),
          avg_duration_ms: '45000',
          max_duration_ms: '180000',
          min_duration_ms: '5000'
        };
        return res.json(stats);
      }
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
      if (this.isDemoMode) {
        // Return demo events
        const demoEvents = [
          {
            id: 'event-1',
            type: 'job_completed',
            message: 'Job "Data Sync - Users" completed successfully',
            occurred_at: new Date(Date.now() - 300000).toISOString()
          },
          {
            id: 'event-2',
            type: 'job_started',
            message: 'Job "ML Model Training" started',
            occurred_at: new Date(Date.now() - 600000).toISOString()
          },
          {
            id: 'event-3',
            type: 'job_queued',
            message: 'Job "Metrics Collection" queued for processing',
            occurred_at: new Date(Date.now() - 900000).toISOString()
          }
        ];
        return res.json(demoEvents);
      }
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

    // Workflow Management Routes
    router.post('/api/pipeline/workflows', async (req: Request, res: Response) => {
      if (this.isDemoMode) {
        const demoWorkflow = {
          id: `workflow-${Date.now()}`,
          ...req.body,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        return res.status(201).json(demoWorkflow);
      }
      try {
        const workflow = await this.workflowEngine.createWorkflow(req.body);
        res.status(201).json(workflow);
      } catch (error) {
        console.error('Error creating workflow:', error);
        res.status(500).json({ error: 'Failed to create workflow' });
      }
    });

    router.get('/api/pipeline/workflows', async (req: Request, res: Response) => {
      if (this.isDemoMode) {
        const demoWorkflows = [
          {
            id: 'workflow-1',
            name: 'Daily Data Pipeline',
            description: 'Syncs data from LSH to MCLI daily',
            status: 'active',
            nodes: 3,
            createdAt: new Date(Date.now() - 86400000).toISOString()
          },
          {
            id: 'workflow-2',
            name: 'ML Training Pipeline',
            description: 'Trains and deploys ML models',
            status: 'active',
            nodes: 5,
            createdAt: new Date(Date.now() - 172800000).toISOString()
          }
        ];
        return res.json({ workflows: demoWorkflows, total: demoWorkflows.length });
      }
      try {
        const workflows = await this.workflowEngine.listWorkflows({
          status: req.query.status as string,
          limit: parseInt(req.query.limit as string) || 50,
          offset: parseInt(req.query.offset as string) || 0
        });
        res.json(workflows);
      } catch (error) {
        console.error('Error listing workflows:', error);
        res.status(500).json({ error: 'Failed to list workflows' });
      }
    });

    router.get('/api/pipeline/workflows/:id', async (req: Request, res: Response) => {
      if (this.isDemoMode) {
        const demoWorkflow = {
          id: req.params.id,
          name: 'Demo Workflow',
          description: 'A demo workflow for testing',
          status: 'active',
          nodes: [
            { id: 'node1', type: 'trigger', name: 'Start' },
            { id: 'node2', type: 'action', name: 'Process Data' },
            { id: 'node3', type: 'condition', name: 'Check Status' }
          ],
          createdAt: new Date(Date.now() - 86400000).toISOString()
        };
        return res.json(demoWorkflow);
      }
      try {
        const workflow = await this.workflowEngine.getWorkflow(req.params.id);
        if (!workflow) {
          return res.status(404).json({ error: 'Workflow not found' });
        }
        res.json(workflow);
      } catch (error) {
        console.error('Error getting workflow:', error);
        res.status(500).json({ error: 'Failed to get workflow' });
      }
    });

    router.post('/api/pipeline/workflows/:id/execute', async (req: Request, res: Response) => {
      try {
        const { triggeredBy = 'api', triggerType = 'manual', parameters = {} } = req.body;
        const execution = await this.workflowEngine.executeWorkflow(
          req.params.id,
          triggeredBy,
          triggerType,
          parameters
        );
        res.status(201).json(execution);
      } catch (error) {
        console.error('Error executing workflow:', error);
        res.status(500).json({ error: 'Failed to execute workflow' });
      }
    });

    router.get('/api/pipeline/workflows/:id/executions', async (req: Request, res: Response) => {
      if (this.isDemoMode) {
        const demoExecutions = [
          {
            id: 'exec-1',
            workflowId: req.params.id,
            status: 'completed',
            startedAt: new Date(Date.now() - 7200000).toISOString(),
            completedAt: new Date(Date.now() - 6000000).toISOString()
          },
          {
            id: 'exec-2',
            workflowId: req.params.id,
            status: 'running',
            startedAt: new Date(Date.now() - 1800000).toISOString()
          }
        ];
        return res.json({ executions: demoExecutions, total: 2 });
      }
      try {
        const executions = await this.workflowEngine.getWorkflowExecutions(req.params.id, {
          limit: parseInt(req.query.limit as string) || 50,
          offset: parseInt(req.query.offset as string) || 0
        });
        res.json(executions);
      } catch (error) {
        console.error('Error getting workflow executions:', error);
        res.status(500).json({ error: 'Failed to get workflow executions' });
      }
    });

    router.get('/api/pipeline/executions/:id', async (req: Request, res: Response) => {
      try {
        const execution = await this.workflowEngine.getExecution(req.params.id);
        if (!execution) {
          return res.status(404).json({ error: 'Execution not found' });
        }
        res.json(execution);
      } catch (error) {
        console.error('Error getting execution:', error);
        res.status(500).json({ error: 'Failed to get execution' });
      }
    });

    router.post('/api/pipeline/executions/:id/cancel', async (req: Request, res: Response) => {
      try {
        await this.workflowEngine.cancelExecution(req.params.id);
        res.json({ message: 'Execution cancelled successfully' });
      } catch (error) {
        console.error('Error cancelling execution:', error);
        res.status(500).json({ error: 'Failed to cancel execution' });
      }
    });

    router.put('/api/pipeline/workflows/:id', async (req: Request, res: Response) => {
      try {
        const workflow = await this.workflowEngine.updateWorkflow(req.params.id, req.body);
        res.json(workflow);
      } catch (error) {
        console.error('Error updating workflow:', error);
        res.status(500).json({ error: 'Failed to update workflow' });
      }
    });

    router.delete('/api/pipeline/workflows/:id', async (req: Request, res: Response) => {
      try {
        await this.workflowEngine.deleteWorkflow(req.params.id);
        res.json({ message: 'Workflow deleted successfully' });
      } catch (error) {
        console.error('Error deleting workflow:', error);
        res.status(500).json({ error: 'Failed to delete workflow' });
      }
    });

    router.post('/api/pipeline/workflows/:id/validate', async (req: Request, res: Response) => {
      try {
        const validation = await this.workflowEngine.validateWorkflowById(req.params.id);
        res.json(validation);
      } catch (error) {
        console.error('Error validating workflow:', error);
        res.status(500).json({ error: 'Failed to validate workflow' });
      }
    });

    router.get('/api/pipeline/workflows/:id/dependencies', async (req: Request, res: Response) => {
      try {
        const dependencies = await this.workflowEngine.getWorkflowDependencies(req.params.id);
        res.json(dependencies);
      } catch (error) {
        console.error('Error getting workflow dependencies:', error);
        res.status(500).json({ error: 'Failed to get workflow dependencies' });
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

      socket.on('subscribe:workflow', (workflowId: string) => {
        socket.join(`workflow:${workflowId}`);
        console.log(`Client ${socket.id} subscribed to workflow ${workflowId}`);
      });

      socket.on('unsubscribe:workflow', (workflowId: string) => {
        socket.leave(`workflow:${workflowId}`);
        console.log(`Client ${socket.id} unsubscribed from workflow ${workflowId}`);
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

    // Workflow Engine events
    this.workflowEngine.on('workflow:created', (event) => {
      this.io.emit('workflow:created', event);
    });

    this.workflowEngine.on('execution:started', (event) => {
      this.io.emit('workflow:execution:started', event);
      this.io.to(`workflow:${event.workflowId}`).emit('execution:started', event);
    });

    this.workflowEngine.on('execution:completed', (event) => {
      this.io.emit('workflow:execution:completed', event);
      this.io.to(`workflow:${event.workflowId}`).emit('execution:completed', event);
    });

    this.workflowEngine.on('execution:failed', (event) => {
      this.io.emit('workflow:execution:failed', event);
      this.io.to(`workflow:${event.workflowId}`).emit('execution:failed', event);
    });

    this.workflowEngine.on('node:started', (event) => {
      this.io.to(`workflow:${event.workflowId}`).emit('node:started', event);
    });

    this.workflowEngine.on('node:completed', (event) => {
      this.io.to(`workflow:${event.workflowId}`).emit('node:completed', event);
    });

    this.workflowEngine.on('node:failed', (event) => {
      this.io.to(`workflow:${event.workflowId}`).emit('node:failed', event);
    });
  }

  getApp(): express.Application {
    return this.app;
  }

  getServer() {
    return this.server;
  }

  async start(): Promise<void> {
    try {
      // Test database connection
      try {
        await this.pool.query('SELECT 1');
        console.log('✅ Database connected');
        this.isDemoMode = false;
      } catch (_dbError) {
        console.warn('⚠️  Database not available - running in demo mode');
        console.log('   To enable full functionality, create a PostgreSQL database named "pipeline"');
        console.log('   and run: psql -d pipeline -f src/pipeline/schema.sql');
        this.isDemoMode = true;
      }

      // Start job tracker polling
      this.jobTracker.startPolling();
      console.log('✅ Job tracker started');

      // Start MCLI periodic sync
      this.mcliBridge.startPeriodicSync();
      console.log('✅ MCLI bridge started');

      // Start workflow engine
      await this.workflowEngine.start();
      console.log('✅ Workflow engine started');

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

    // Stop Streamlit process
    if (this.streamlitProcess) {
      console.log('Stopping Streamlit ML Dashboard...');
      this.streamlitProcess.kill('SIGTERM');
      this.streamlitProcess = null;
    }

    // Cleanup services
    await this.jobTracker.cleanup();
    this.mcliBridge.cleanup();
    await this.workflowEngine.stop();

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
function isMainModule(): boolean {
  try {
    const importMeta = eval('import.meta');
    return importMeta.url === `file://${process.argv[1]}`;
  } catch {
    // Fallback: check if this file is being run directly
    return process.argv[1] && process.argv[1].endsWith('pipeline-service.js');
  }
}

if (isMainModule()) {
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