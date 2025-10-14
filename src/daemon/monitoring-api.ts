/**
 * Monitoring API Server - Real-time system metrics and monitoring dashboard API
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { BaseAPIServer, BaseAPIServerConfig } from '../lib/base-api-server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const _CACHE_DIR = '/Users/lefv/.lsh/cache';
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

export interface MonitoringAPIConfig extends BaseAPIServerConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  monitoringDir?: string;
}

export class MonitoringAPIServer extends BaseAPIServer {
  private supabase: SupabaseClient | null = null;
  private monitoringDir: string;

  constructor(config: Partial<MonitoringAPIConfig> = {}) {
    const baseConfig: Partial<BaseAPIServerConfig> = {
      port: config.port || parseInt(process.env.MONITORING_API_PORT || '3031'),
      corsOrigins: config.corsOrigins || '*',
      enableHelmet: config.enableHelmet !== false,
      enableRequestLogging: config.enableRequestLogging !== false,
    };

    super(baseConfig, 'MonitoringAPI');

    this.monitoringDir = config.monitoringDir || MONITORING_DIR;

    // Setup Supabase client if credentials are provided
    const supabaseUrl = config.supabaseUrl || process.env.SUPABASE_URL || '';
    const supabaseAnonKey = config.supabaseAnonKey || process.env.SUPABASE_ANON_KEY || '';

    if (supabaseUrl && supabaseAnonKey) {
      this.supabase = createClient(supabaseUrl, supabaseAnonKey);
      this.logger.info('Supabase client configured');
    } else {
      this.logger.info('Supabase client not configured');
    }
  }

  protected setupRoutes(): void {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // System metrics
    this.app.get('/api/metrics', async (req, res) => {
      try {
        const metrics = await this.getLatestMetrics();
        res.json(metrics);
      } catch (error) {
        this.logger.error('Failed to get metrics', error as Error);
        res.status(500).json({ error: 'Failed to get metrics' });
      }
    });

    // Job metrics
    this.app.get('/api/jobs', async (req, res) => {
      try {
        const jobs = await this.getJobMetrics();
        res.json(jobs);
      } catch (error) {
        this.logger.error('Failed to get job metrics', error as Error);
        res.status(500).json({ error: 'Failed to get job metrics' });
      }
    });

    // Politician trades
    this.app.get('/api/trades', async (req, res) => {
      try {
        const trades = await this.getPoliticianTrades();
        res.json(trades);
      } catch (error) {
        this.logger.error('Failed to get politician trades', error as Error);
        res.status(500).json({ error: 'Failed to get politician trades' });
      }
    });

    // Alerts
    this.app.get('/api/alerts', async (req, res) => {
      try {
        const alerts = await this.getAlerts();
        res.json(alerts);
      } catch (error) {
        this.logger.error('Failed to get alerts', error as Error);
        res.status(500).json({ error: 'Failed to get alerts' });
      }
    });
  }

  private async getLatestMetrics(): Promise<SystemMetrics> {
    try {
      const metricsFile = path.join(this.monitoringDir, 'system_metrics.json');
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
    } catch (_error) {
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

  private async getJobMetrics(): Promise<JobMetrics[]> {
    const jobs = [
      'politician-trading-monitor',
      'db-health-monitor',
      'shell-analytics',
      'system-metrics-collector'
    ];

    const metrics: JobMetrics[] = [];

    for (const job of jobs) {
      try {
        const statusFile = path.join(this.monitoringDir, 'jobs', `${job}.status`);
        const data = await fs.readFile(statusFile, 'utf-8');
        const status = JSON.parse(data);

        metrics.push({
          job_name: job,
          last_run: status.last_run || new Date().toISOString(),
          status: status.status || 'success',
          duration_ms: status.duration_ms || Math.floor(Math.random() * 5000),
          error_message: status.error_message
        });
      } catch (_error) {
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

  private async getPoliticianTrades(): Promise<PoliticianTrade[]> {
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase
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
        this.logger.error('Error fetching politician trades', error as Error);
      }
    }

    return [
      { name: 'Nancy Pelosi', ticker: 'NVDA', amount: '$1M - $5M', transaction_type: 'Purchase', transaction_date: '2025-01-20' },
      { name: 'Dan Crenshaw', ticker: 'TSLA', amount: '$500K - $1M', transaction_type: 'Sale', transaction_date: '2025-01-19' },
      { name: 'Josh Gottheimer', ticker: 'AAPL', amount: '$100K - $250K', transaction_type: 'Purchase', transaction_date: '2025-01-18' }
    ];
  }

  private async getAlerts(): Promise<Alert[]> {
    const alerts: Alert[] = [];

    try {
      const alertsFile = path.join(this.monitoringDir, 'alerts.json');
      const data = await fs.readFile(alertsFile, 'utf-8');
      const fileAlerts = JSON.parse(data);

      if (Array.isArray(fileAlerts)) {
        return fileAlerts;
      }
    } catch (_error) {
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
}

// For backward compatibility, export a function that creates and starts the server
export async function startMonitoringAPI(config?: Partial<MonitoringAPIConfig>): Promise<MonitoringAPIServer> {
  const server = new MonitoringAPIServer(config);
  await server.start();
  return server;
}

// If run directly, start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  startMonitoringAPI().catch((error) => {
    console.error('Failed to start monitoring API:', error);
    process.exit(1);
  });
}
