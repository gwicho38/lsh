import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { Pool } from 'pg';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  generateAnalyticsReport,
  generateTrendAnalysis,
  detectBuildAnomalies,
  generateInsights,
  predictNextPeriod,
  calculateCostAnalysis,
  detectBottlenecks
} from './analytics.js';
import { CacheManager } from './cache-manager.js';
import { AuthService, authenticate, authorize, requirePermission as _requirePermission, rateLimit } from './auth.js';
import { performanceMonitor } from './performance-monitor.js';
import { DataRetentionService } from './data-retention.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.raw({ type: 'application/json', limit: '10mb' }));

// Serve static dashboard files
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const GITLAB_WEBHOOK_SECRET = process.env.GITLAB_WEBHOOK_SECRET;
const JENKINS_WEBHOOK_SECRET = process.env.JENKINS_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ?
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
const redis = new Redis(REDIS_URL);

// Initialize PostgreSQL pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/cicd'
});

// Initialize services
const cacheManager = new CacheManager(REDIS_URL);
const authService = new AuthService(pool);
const retentionService = new DataRetentionService(pool, redis);

// Apply performance monitoring middleware
app.use(performanceMonitor.middleware());

interface PipelineEvent {
  id: string;
  platform: 'github' | 'gitlab' | 'jenkins';
  repository: string;
  branch: string;
  commit_sha: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped';
  workflow_name: string;
  job_name?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  actor: string;
  event_type: string;
  workflow_url: string;
  logs_url?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  artifacts?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
}

function verifyGitHubSignature(payload: string, signature: string): boolean {
  if (!GITHUB_WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error('GITHUB_WEBHOOK_SECRET not set in production');
      return false;
    }
    console.warn('WARNING: GITHUB_WEBHOOK_SECRET not set - skipping verification (dev mode)');
    return true;
  }

  if (!signature) {
    console.error('No signature provided in webhook request');
    return false;
  }

  const hmac = crypto.createHmac('sha256', GITHUB_WEBHOOK_SECRET);
  const digest = hmac.update(payload, 'utf8').digest('hex');
  const checksum = `sha256=${digest}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(checksum, 'utf8')
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGitHubWorkflowEvent(body: any): PipelineEvent | null {
  const { workflow_run, workflow_job, action } = body;

  if (!workflow_run && !workflow_job) return null;

  const run = workflow_run || workflow_job.workflow_run;
  const job = workflow_job;

  const event: PipelineEvent = {
    id: job ? `${run.id}-${job.id}` : run.id.toString(),
    platform: 'github',
    repository: run.repository.full_name,
    branch: run.head_branch,
    commit_sha: run.head_sha,
    status: mapGitHubStatus(job?.status || run.status),
    conclusion: job?.conclusion || run.conclusion,
    workflow_name: run.workflow?.name || run.name,
    job_name: job?.name,
    started_at: job?.started_at || run.created_at,
    completed_at: job?.completed_at || run.updated_at,
    duration_ms: calculateDuration(
      job?.started_at || run.created_at,
      job?.completed_at || run.updated_at
    ),
    actor: run.actor.login,
    event_type: action,
    workflow_url: run.html_url,
    logs_url: job?.html_url,
    metadata: {
      run_number: run.run_number,
      attempt: run.run_attempt,
      workflow_id: run.workflow_id,
      job_id: job?.id,
      runner_id: job?.runner_id,
      runner_name: job?.runner_name
    }
  };

  return event;
}

function mapGitHubStatus(status: string): PipelineEvent['status'] {
  switch (status) {
    case 'queued': return 'queued';
    case 'in_progress': return 'in_progress';
    case 'completed': return 'completed';
    default: return 'failed';
  }
}

function calculateDuration(startTime: string, endTime?: string): number | undefined {
  if (!endTime) return undefined;
  return new Date(endTime).getTime() - new Date(startTime).getTime();
}

function verifyGitLabSignature(payload: string, signature: string): boolean {
  if (!GITLAB_WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error('GITLAB_WEBHOOK_SECRET not set in production');
      return false;
    }
    console.warn('WARNING: GITLAB_WEBHOOK_SECRET not set - skipping verification (dev mode)');
    return true;
  }

  if (!signature) {
    console.error('No signature provided in GitLab webhook request');
    return false;
  }

  const hmac = crypto.createHmac('sha256', GITLAB_WEBHOOK_SECRET);
  const digest = hmac.update(payload, 'utf8').digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(digest, 'utf8')
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGitLabPipelineEvent(body: any): PipelineEvent | null {
  const { object_kind, object_attributes, project, user } = body;

  if (object_kind !== 'pipeline' && object_kind !== 'job') return null;

  const pipeline = object_attributes;
  const isJob = object_kind === 'job';

  if (!pipeline) return null;

  const event: PipelineEvent = {
    id: isJob ? `${pipeline.pipeline_id}-${pipeline.id}` : pipeline.id.toString(),
    platform: 'gitlab',
    repository: project.path_with_namespace,
    branch: pipeline.ref,
    commit_sha: pipeline.sha || pipeline.commit?.id || 'unknown',
    status: mapGitLabStatus(pipeline.status),
    conclusion: mapGitLabConclusion(pipeline.status),
    workflow_name: isJob ? pipeline.stage : `Pipeline ${pipeline.id}`,
    job_name: isJob ? pipeline.name : undefined,
    started_at: pipeline.started_at || pipeline.created_at,
    completed_at: pipeline.finished_at,
    duration_ms: pipeline.duration ? pipeline.duration * 1000 : calculateDuration(
      pipeline.started_at || pipeline.created_at,
      pipeline.finished_at
    ),
    actor: user?.username || user?.name || 'unknown',
    event_type: object_kind,
    workflow_url: project.web_url + '/-/pipelines/' + (isJob ? pipeline.pipeline_id : pipeline.id),
    logs_url: isJob ? project.web_url + '/-/jobs/' + pipeline.id : undefined,
    metadata: {
      pipeline_id: isJob ? pipeline.pipeline_id : pipeline.id,
      job_id: isJob ? pipeline.id : undefined,
      stage: pipeline.stage,
      runner_id: pipeline.runner?.id,
      runner_description: pipeline.runner?.description,
      tag_list: pipeline.tag_list || [],
      variables: pipeline.variables || []
    }
  };

  return event;
}

function mapGitLabStatus(status: string): PipelineEvent['status'] {
  switch (status) {
    case 'created':
    case 'waiting_for_resource':
    case 'preparing':
      return 'queued';
    case 'pending':
    case 'running':
      return 'in_progress';
    case 'success':
      return 'completed';
    case 'failed':
    case 'canceled':
    case 'skipped':
      return 'failed';
    default:
      return 'failed';
  }
}

function mapGitLabConclusion(status: string): PipelineEvent['conclusion'] {
  switch (status) {
    case 'success': return 'success';
    case 'failed': return 'failure';
    case 'canceled': return 'cancelled';
    case 'skipped': return 'skipped';
    default: return 'failure';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJenkinsEvent(body: any): PipelineEvent | null {
  const { name, url, build, timestamp } = body;

  if (!build) return null;

  const buildUrl = url + build.number + '/';
  const duration = build.duration || (Date.now() - timestamp);

  const event: PipelineEvent = {
    id: `jenkins-${name}-${build.number}`,
    platform: 'jenkins',
    repository: name, // Jenkins job name as repository
    branch: build.parameters?.BRANCH_NAME || build.parameters?.GIT_BRANCH || 'main',
    commit_sha: build.parameters?.GIT_COMMIT || build.scm?.SHA1 || 'unknown',
    status: mapJenkinsStatus(build.phase || build.status),
    conclusion: mapJenkinsConclusion(build.result),
    workflow_name: name,
    job_name: build.fullDisplayName,
    started_at: new Date(timestamp).toISOString(),
    completed_at: build.result ? new Date(timestamp + duration).toISOString() : undefined,
    duration_ms: build.result ? duration : undefined,
    actor: build.parameters?.TRIGGERED_BY || 'jenkins',
    event_type: build.phase || 'build',
    workflow_url: buildUrl,
    logs_url: buildUrl + 'console',
    metadata: {
      job_name: name,
      build_number: build.number,
      queue_id: build.queue_id,
      executor: build.executor,
      node: build.builtOn,
      parameters: build.parameters || {},
      causes: build.causes || []
    }
  };

  return event;
}

function mapJenkinsStatus(phase: string): PipelineEvent['status'] {
  switch (phase?.toLowerCase()) {
    case 'queued': return 'queued';
    case 'started':
    case 'running': return 'in_progress';
    case 'completed':
    case 'finished': return 'completed';
    default: return 'failed';
  }
}

function mapJenkinsConclusion(result: string): PipelineEvent['conclusion'] {
  switch (result?.toUpperCase()) {
    case 'SUCCESS': return 'success';
    case 'FAILURE': return 'failure';
    case 'ABORTED': return 'cancelled';
    case 'UNSTABLE': return 'failure';
    default: return undefined;
  }
}

async function storePipelineEvent(event: PipelineEvent): Promise<void> {
  try {
    // Store in PostgreSQL via Supabase
    if (supabase) {
      const { error } = await supabase
        .from('pipeline_events')
        .upsert(event);

      if (error) {
        console.error('Error storing to Supabase:', error);
      }
    }

    // Cache in Redis for real-time access
    await redis.setex(`pipeline:${event.id}`, 3600, JSON.stringify(event));

    // Update metrics in Redis
    await updateMetrics(event);

    // Emit real-time update to all connected clients
    io.emit('pipeline_event', {
      type: 'pipeline_update',
      event: event,
      timestamp: new Date().toISOString()
    });

    // Emit updated metrics
    const updatedMetrics = await getLatestMetricsFromRedis();
    io.emit('metrics_update', {
      type: 'metrics_update',
      metrics: updatedMetrics,
      timestamp: new Date().toISOString()
    });

    console.log(`Stored pipeline event: ${event.id} (${event.status})`);
  } catch (error) {
    console.error('Error storing pipeline event:', error);
  }
}

async function updateMetrics(event: PipelineEvent): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const key = `metrics:${today}`;

  // Update daily metrics
  await redis.hincrby(key, 'total_builds', 1);

  if (event.status === 'completed') {
    if (event.conclusion === 'success') {
      await redis.hincrby(key, 'successful_builds', 1);
    } else {
      await redis.hincrby(key, 'failed_builds', 1);
    }
  }

  if (event.duration_ms) {
    await redis.lpush(`durations:${today}`, event.duration_ms);
    await redis.ltrim(`durations:${today}`, 0, 999); // Keep last 1000 durations
  }

  // Set expiry for daily metrics (30 days)
  await redis.expire(key, 30 * 24 * 60 * 60);
}

async function getLatestMetricsFromRedis() {
  const today = new Date().toISOString().split('T')[0];
  const key = `metrics:${today}`;

  const metrics = await redis.hgetall(key);
  const durations = await redis.lrange(`durations:${today}`, 0, -1);

  const totalBuilds = parseInt(metrics.total_builds || '0');
  const successfulBuilds = parseInt(metrics.successful_builds || '0');
  const failedBuilds = parseInt(metrics.failed_builds || '0');

  const avgDuration = durations.length > 0
    ? durations.reduce((sum, d) => sum + parseInt(d), 0) / durations.length
    : 0;

  return {
    totalBuilds,
    successfulBuilds,
    failedBuilds,
    successRate: totalBuilds > 0 ? (successfulBuilds / totalBuilds) * 100 : 0,
    avgDurationMs: Math.round(avgDuration),
    activePipelines: await redis.keys('pipeline:*').then(keys => keys.length),
    timestamp: new Date().toISOString()
  };
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send current metrics on connection
  getLatestMetricsFromRedis().then(metrics => {
    socket.emit('metrics_update', {
      type: 'metrics_update',
      metrics: metrics,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });

  socket.on('subscribe_logs', (pipelineId) => {
    socket.join(`logs:${pipelineId}`);
    console.log(`Client ${socket.id} subscribed to logs for pipeline ${pipelineId}`);
  });

  socket.on('unsubscribe_logs', (pipelineId) => {
    socket.leave(`logs:${pipelineId}`);
    console.log(`Client ${socket.id} unsubscribed from logs for pipeline ${pipelineId}`);
  });
});

// GitHub webhook endpoint
app.post('/webhook/github', async (req: Request, res: Response) => {
  try {
    const signature = req.get('x-hub-signature-256') || '';
    const payload = JSON.stringify(req.body);

    if (!verifyGitHubSignature(payload, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = parseGitHubWorkflowEvent(req.body);
    if (event) {
      await storePipelineEvent(event);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('GitHub webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GitLab webhook endpoint
app.post('/webhook/gitlab', async (req: Request, res: Response) => {
  try {
    const signature = req.get('x-gitlab-token') || '';
    const payload = JSON.stringify(req.body);

    if (!verifyGitLabSignature(payload, signature)) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const event = parseGitLabPipelineEvent(req.body);
    if (event) {
      await storePipelineEvent(event);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('GitLab webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Jenkins webhook endpoint
app.post('/webhook/jenkins', async (req: Request, res: Response) => {
  try {
    // Jenkins doesn't use HMAC signatures by default, but we can check for a token
    const token = req.get('authorization') || req.get('x-jenkins-token') || '';

    if (JENKINS_WEBHOOK_SECRET && token !== `Bearer ${JENKINS_WEBHOOK_SECRET}`) {
      return res.status(401).json({ error: 'Invalid authorization' });
    }

    const event = parseJenkinsEvent(req.body);
    if (event) {
      await storePipelineEvent(event);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Jenkins webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Root route - redirect to main dashboard
app.get('/', (req: Request, res: Response) => {
  res.redirect('/dashboard/');
});

// Dashboard routes
app.get('/dashboard/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'index.html'));
});

app.get('/dashboard/analytics', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'analytics.html'));
});

app.get('/dashboard/admin', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'admin.html'));
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const health = performanceMonitor.getHealthStatus();
  res.json({
    status: health.status,
    timestamp: new Date().toISOString(),
    services: {
      supabase: !!supabase,
      redis: redis.status === 'ready',
      postgres: pool ? 'connected' : 'disconnected'
    },
    performance: health.details
  });
});

// Get recent pipeline events
app.get('/api/pipelines', async (req: Request, res: Response) => {
  try {
    const { limit = 50, status, repository, platform } = req.query;

    let query = supabase?.from('pipeline_events').select('*');

    if (status) {
      query = query?.eq('status', status);
    }

    if (repository) {
      query = query?.eq('repository', repository);
    }

    if (platform) {
      query = query?.eq('platform', platform);
    }

    const { data, error } = await query
      ?.order('started_at', { ascending: false })
      ?.limit(Number(limit)) || { data: null, error: null };

    if (error) {
      throw error;
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching pipelines:', error);
    res.status(500).json({ error: 'Failed to fetch pipelines' });
  }
});

// Get pipeline metrics
app.get('/api/metrics', async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const key = `metrics:${today}`;

    const metrics = await redis.hgetall(key);
    const durations = await redis.lrange(`durations:${today}`, 0, -1);

    const totalBuilds = parseInt(metrics.total_builds || '0');
    const successfulBuilds = parseInt(metrics.successful_builds || '0');
    const failedBuilds = parseInt(metrics.failed_builds || '0');

    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + parseInt(d), 0) / durations.length
      : 0;

    res.json({
      totalBuilds,
      successfulBuilds,
      failedBuilds,
      successRate: totalBuilds > 0 ? (successfulBuilds / totalBuilds) * 100 : 0,
      avgDurationMs: Math.round(avgDuration),
      activePipelines: await redis.keys('pipeline:*').then(keys => keys.length),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Analytics endpoints
app.get('/api/analytics/report', async (req: Request, res: Response) => {
  try {
    const { period = 'weekly' } = req.query;
    const report = await generateAnalyticsReport(period as 'daily' | 'weekly' | 'monthly');
    res.json(report);
  } catch (error) {
    console.error('Error generating analytics report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

app.get('/api/analytics/trends', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const trends = await generateTrendAnalysis(Number(days));
    res.json(trends);
  } catch (error) {
    console.error('Error fetching trends:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

app.get('/api/analytics/anomalies', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const trends = await generateTrendAnalysis(Number(days));
    const anomalies = await detectBuildAnomalies(trends);
    res.json(anomalies);
  } catch (error) {
    console.error('Error detecting anomalies:', error);
    res.status(500).json({ error: 'Failed to detect anomalies' });
  }
});

app.get('/api/analytics/insights', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const trends = await generateTrendAnalysis(Number(days));
    const insights = await generateInsights(trends);
    res.json(insights);
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

app.get('/api/analytics/predictions', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const trends = await generateTrendAnalysis(Number(days));
    const predictions = await predictNextPeriod(trends);
    res.json(predictions);
  } catch (error) {
    console.error('Error generating predictions:', error);
    res.status(500).json({ error: 'Failed to generate predictions' });
  }
});

app.get('/api/analytics/costs', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const trends = await generateTrendAnalysis(Number(days));
    const costAnalysis = await calculateCostAnalysis(trends);
    res.json(costAnalysis);
  } catch (error) {
    console.error('Error calculating costs:', error);
    res.status(500).json({ error: 'Failed to calculate costs' });
  }
});

app.get('/api/analytics/bottlenecks', async (req: Request, res: Response) => {
  try {
    const bottlenecks = await detectBottlenecks();
    res.json(bottlenecks);
  } catch (error) {
    console.error('Error detecting bottlenecks:', error);
    res.status(500).json({ error: 'Failed to detect bottlenecks' });
  }
});

// Authentication endpoints
app.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    const user = await authService.register(email, password, name, role);
    const token = authService.generateToken(user);
    res.json({ user, token });
  } catch (error) {
    const err = error as Error;
    res.status(400).json({ error: err.message });
  }
});

app.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    res.status(401).json({ error: err.message });
  }
});

app.post('/auth/api-key',
  authenticate(authService),
  authorize('admin', 'developer'),
  async (req: Request, res: Response) => {
    try {
      const { name, permissions } = req.body;
      const apiKey = await authService.generateApiKey(req.user!.userId, name, permissions);
      res.json({ apiKey });
    } catch (error) {
      const err = error as Error;
      res.status(400).json({ error: err.message });
    }
  }
);

// Protected admin endpoints
app.get('/api/admin/performance',
  authenticate(authService),
  authorize('admin'),
  (req: Request, res: Response) => {
    const metrics = performanceMonitor.getMetrics();
    res.json(metrics);
  }
);

app.get('/api/admin/cache/stats',
  authenticate(authService),
  authorize('admin'),
  async (req: Request, res: Response) => {
    const stats = await cacheManager.getStats();
    res.json(stats);
  }
);

app.post('/api/admin/cache/clear',
  authenticate(authService),
  authorize('admin'),
  async (req: Request, res: Response) => {
    await cacheManager.clear();
    res.json({ message: 'Cache cleared successfully' });
  }
);

app.get('/api/admin/retention/stats',
  authenticate(authService),
  authorize('admin'),
  async (req: Request, res: Response) => {
    const stats = await retentionService.getRetentionStats();
    res.json(stats);
  }
);

app.post('/api/admin/retention/cleanup',
  authenticate(authService),
  authorize('admin'),
  async (req: Request, res: Response) => {
    const { tableName } = req.body;
    const result = await retentionService.triggerCleanup(tableName);
    res.json(result);
  }
);

// Apply rate limiting to API endpoints
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each user to 100 requests per windowMs
});

app.use('/api/', apiRateLimit);

const PORT = process.env.WEBHOOK_PORT || 3033;

server.listen(PORT, () => {
  console.log(`🚀 CI/CD Webhook receiver running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
  console.log(`🔄 WebSocket server enabled for real-time updates`);
  console.log(`📈 Analytics API available at http://localhost:${PORT}/api/analytics/*`);
});