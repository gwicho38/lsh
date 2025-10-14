/**
 * Simple LSH API Server for fly.io deployment
 * Provides basic health endpoint and job management API
 */

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = parseInt(process.env.PORT || '3030', 10);

// Initialize Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('🔧 Supabase Configuration:');
console.log(`  URL: ${SUPABASE_URL ? '✓ Set' : '✗ Missing'}`);
console.log(`  SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? '✓ Set (' + SUPABASE_SERVICE_ROLE_KEY.substring(0, 20) + '...)' : '✗ Missing'}`);

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;
console.log(`  Client: ${supabase ? '✓ Created' : '✗ Not created'}`);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'LSH Daemon',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '0.5.2'
  });
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    running: true,
    pid: process.pid,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    version: '0.5.2'
  });
});

// Jobs endpoint - fetches real jobs from Supabase
app.get('/api/jobs', async (req, res) => {
  console.log('📥 GET /api/jobs request received');

  if (!supabase) {
    console.error('❌ Supabase client not initialized');
    return res.status(503).json({
      error: 'Supabase not configured',
      message: 'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set',
      debug: {
        url_set: !!SUPABASE_URL,
        service_role_key_set: !!SUPABASE_SERVICE_ROLE_KEY
      }
    });
  }

  try {
    console.log('🔍 Fetching jobs from lsh_jobs table...');

    // Fetch jobs with their latest execution
    const { data: jobs, error: jobsError } = await supabase
      .from('lsh_jobs')
      .select('*')
      .order('priority', { ascending: false });

    console.log(`  Jobs query result: ${jobs ? jobs.length + ' rows' : 'null'}`);
    if (jobsError) {
      console.error('  Jobs error:', jobsError);
      throw jobsError;
    }

    console.log('🔍 Fetching executions from lsh_job_executions table...');

    // Fetch recent executions for each job
    const { data: executions, error: execError } = await supabase
      .from('lsh_job_executions')
      .select('job_id, execution_id, status, started_at, completed_at, duration_ms')
      .order('started_at', { ascending: false });

    console.log(`  Executions query result: ${executions ? executions.length + ' rows' : 'null'}`);
    if (execError) {
      console.error('  Executions error:', execError);
      throw execError;
    }

    // Create a map of latest execution per job
    const latestExecutions = new Map();
    for (const exec of executions || []) {
      if (!latestExecutions.has(exec.job_id)) {
        latestExecutions.set(exec.job_id, exec);
      }
    }

    // Transform jobs to match expected format
    const transformedJobs = (jobs || []).map(job => {
      const latestExec = latestExecutions.get(job.id);
      return {
        job_name: job.job_name,
        status: latestExec?.status || 'pending',
        last_run: latestExec?.started_at || null,
        duration_ms: latestExec?.duration_ms || 0,
        timestamp: latestExec?.started_at || job.created_at,
        job_type: job.type,
        job_status: job.status,
        cron_expression: job.cron_expression,
        interval_seconds: job.interval_seconds,
        tags: job.tags
      };
    });

    console.log(`✅ Successfully transformed ${transformedJobs.length} jobs`);

    res.json({
      jobs: transformedJobs,
      total: transformedJobs.length,
      message: 'Real-time job data from Supabase'
    });
  } catch (error) {
    console.error('❌ Error fetching jobs:', error);
    console.error('   Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    res.status(500).json({
      error: 'Failed to fetch jobs',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'LSH Daemon API',
    version: '0.5.2',
    endpoints: [
      '/health',
      '/api/status',
      '/api/jobs'
    ]
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 LSH API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Status: http://localhost:${PORT}/api/status`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
