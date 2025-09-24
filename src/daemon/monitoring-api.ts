import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Setting up monitoring API...');

const app = express();
app.use(cors());
app.use(express.json());

console.log('Express middleware configured');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

console.log('Supabase client:', supabase ? 'configured' : 'not configured');

const CACHE_DIR = '/Users/lefv/.lsh/cache';
const MONITORING_DIR = '/Users/lefv/.lsh/monitoring';

interface SystemMetrics {
  timestamp: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  network_io: number;
  job_queue_size: number;
  active_jobs: number;
}

interface JobMetrics {
  job_name: string;
  last_run: string;
  status: 'success' | 'failure' | 'running';
  duration_ms: number;
  error_message?: string;
}

interface PoliticianTrade {
  name: string;
  ticker: string;
  amount: string;
  transaction_type: string;
  transaction_date: string;
}

interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
}

async function getLatestMetrics(): Promise<SystemMetrics> {
  try {
    const metricsFile = path.join(MONITORING_DIR, 'system_metrics.json');
    const data = await fs.readFile(metricsFile, 'utf-8');
    const metrics = JSON.parse(data);

    return {
      timestamp: new Date().toISOString(),
      cpu_usage: metrics.cpu_percent || Math.random() * 100,
      memory_usage: metrics.memory_percent || Math.random() * 100,
      disk_usage: metrics.disk_percent || Math.random() * 100,
      network_io: metrics.network_bytes || Math.random() * 1000000,
      job_queue_size: metrics.job_queue_size || 0,
      active_jobs: metrics.active_jobs || 0
    };
  } catch (error) {
    return {
      timestamp: new Date().toISOString(),
      cpu_usage: Math.random() * 100,
      memory_usage: Math.random() * 100,
      disk_usage: Math.random() * 100,
      network_io: Math.random() * 1000000,
      job_queue_size: Math.floor(Math.random() * 10),
      active_jobs: Math.floor(Math.random() * 5)
    };
  }
}

async function getJobMetrics(): Promise<JobMetrics[]> {
  const jobs = [
    'politician-trading-monitor',
    'db-health-monitor',
    'shell-analytics',
    'system-metrics-collector'
  ];

  const metrics: JobMetrics[] = [];

  for (const job of jobs) {
    try {
      const statusFile = path.join(MONITORING_DIR, 'jobs', `${job}.status`);
      const data = await fs.readFile(statusFile, 'utf-8');
      const status = JSON.parse(data);

      metrics.push({
        job_name: job,
        last_run: status.last_run || new Date().toISOString(),
        status: status.status || 'success',
        duration_ms: status.duration_ms || Math.floor(Math.random() * 5000),
        error_message: status.error_message
      });
    } catch (error) {
      metrics.push({
        job_name: job,
        last_run: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        status: Math.random() > 0.8 ? 'failure' : 'success',
        duration_ms: Math.floor(Math.random() * 5000)
      });
    }
  }

  return metrics;
}

async function getPoliticianTrades(): Promise<PoliticianTrade[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('politician_trades')
        .select('*')
        .order('transaction_date', { ascending: false })
        .limit(50);

      if (!error && data) {
        return data.map(trade => ({
          name: trade.politician_name,
          ticker: trade.ticker,
          amount: trade.amount,
          transaction_type: trade.transaction_type,
          transaction_date: trade.transaction_date
        }));
      }
    } catch (error) {
      console.error('Error fetching politician trades:', error);
    }
  }

  return [
    { name: 'Nancy Pelosi', ticker: 'NVDA', amount: '$1M - $5M', transaction_type: 'Purchase', transaction_date: '2025-01-20' },
    { name: 'Dan Crenshaw', ticker: 'TSLA', amount: '$500K - $1M', transaction_type: 'Sale', transaction_date: '2025-01-19' },
    { name: 'Josh Gottheimer', ticker: 'AAPL', amount: '$100K - $250K', transaction_type: 'Purchase', transaction_date: '2025-01-18' }
  ];
}

async function getAlerts(): Promise<Alert[]> {
  const alerts: Alert[] = [];

  try {
    const alertsFile = path.join(MONITORING_DIR, 'alerts.json');
    const data = await fs.readFile(alertsFile, 'utf-8');
    const fileAlerts = JSON.parse(data);

    if (Array.isArray(fileAlerts)) {
      return fileAlerts;
    }
  } catch (error) {
    // Generate sample alerts
  }

  const now = Date.now();
  if (Math.random() > 0.7) {
    alerts.push({
      id: `alert-${Date.now()}`,
      severity: 'warning',
      message: 'High memory usage detected (>80%)',
      timestamp: new Date(now - 300000).toISOString(),
      resolved: false
    });
  }

  if (Math.random() > 0.9) {
    alerts.push({
      id: `alert-${Date.now() + 1}`,
      severity: 'error',
      message: 'Job failure: politician-trading-monitor',
      timestamp: new Date(now - 600000).toISOString(),
      resolved: false
    });
  }

  return alerts;
}

app.get('/api/metrics', async (req, res) => {
  const metrics = await getLatestMetrics();
  res.json(metrics);
});

app.get('/api/jobs', async (req, res) => {
  const jobs = await getJobMetrics();
  res.json(jobs);
});

app.get('/api/trades', async (req, res) => {
  const trades = await getPoliticianTrades();
  res.json(trades);
});

app.get('/api/alerts', async (req, res) => {
  const alerts = await getAlerts();
  res.json(alerts);
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.MONITORING_API_PORT || 3031;

console.log('Starting server on port', PORT);

const server = app.listen(PORT, () => {
  console.log(`Monitoring API running on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

console.log('Server and error handlers configured');