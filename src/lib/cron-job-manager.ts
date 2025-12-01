/**
 * Cron Job Manager with Supabase Integration
 * Manages scheduled jobs with database persistence and monitoring
 *
 * REFACTORED: Now extends BaseJobManager for unified job management interface
 */

import {
  BaseJobManager,
  BaseJobSpec,
} from './base-job-manager.js';
import DatabaseJobStorage from './job-storage-database.js';
import DaemonClient, { CronJobSpec } from './daemon-client.js';
import DatabasePersistence from './database-persistence.js';
import { DEFAULTS } from '../constants/index.js';

export interface CronJobTemplate {
  id: string;
  name: string;
  description: string;
  command: string;
  schedule: string;
  category: 'maintenance' | 'backup' | 'monitoring' | 'data-processing' | 'custom';
  tags: string[];
  environment?: Record<string, string>;
  workingDirectory?: string;
  priority?: number;
  maxRetries?: number;
  timeout?: number;
}

export interface JobExecutionReport {
  jobId: string;
  executions: number;
  successes: number;
  failures: number;
  successRate: number;
  averageDuration: number;
  lastExecution?: Date;
  lastSuccess?: Date;
  lastFailure?: Date;
  commonErrors: Array<{ error: string; count: number }>;
}

export class CronJobManager extends BaseJobManager {
  private daemonClient: DaemonClient;
  private databasePersistence: DatabasePersistence;
  private templates: Map<string, CronJobTemplate> = new Map();
  private userId?: string;

  constructor(userId?: string) {
    super(new DatabaseJobStorage(userId), 'CronJobManager');
    this.userId = userId;
    this.daemonClient = new DaemonClient(undefined, userId);
    this.databasePersistence = new DatabasePersistence(userId);
    this.loadTemplates();
  }

  /**
   * Load predefined job templates
   */
  private loadTemplates(): void {
    const templates: CronJobTemplate[] = [
      {
        id: 'database-backup',
        name: 'Database Backup',
        description: 'Daily database backup',
        command: 'pg_dump -h localhost -U postgres mydb > /backups/mydb_$(date +%Y%m%d).sql',
        schedule: '0 2 * * *',
        category: 'backup',
        tags: ['database', 'backup', 'daily'],
        workingDirectory: '/backups',
        priority: 8,
        maxRetries: 3,
        timeout: DEFAULTS.JOB_TIMEOUT_1H_MS,
      },
      {
        id: 'log-cleanup',
        name: 'Log Cleanup',
        description: 'Clean old log files',
        command: 'find /var/log -name "*.log" -mtime +30 -delete',
        schedule: '0 3 * * 0',
        category: 'maintenance',
        tags: ['logs', 'cleanup', 'weekly'],
        priority: 3,
        maxRetries: 2,
        timeout: DEFAULTS.JOB_TIMEOUT_5M_MS,
      },
      {
        id: 'disk-monitor',
        name: 'Disk Space Monitor',
        description: 'Monitor disk space usage',
        command: 'df -h | awk \'$5 > 80 {print $0}\' | mail -s "Disk Space Alert" admin@example.com',
        schedule: '*/15 * * * *',
        category: 'monitoring',
        tags: ['monitoring', 'disk', 'alert'],
        priority: 7,
        maxRetries: 1,
        timeout: DEFAULTS.JOB_TIMEOUT_1M_MS,
      },
      {
        id: 'data-sync',
        name: 'Data Synchronization',
        description: 'Sync data with external systems',
        command: 'rsync -av /data/ user@remote:/backup/data/',
        schedule: '0 1 * * *',
        category: 'data-processing',
        tags: ['sync', 'data', 'daily'],
        workingDirectory: '/data',
        priority: 6,
        maxRetries: 5,
        timeout: DEFAULTS.JOB_TIMEOUT_2H_MS,
      },
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Connect to daemon
   */
  public async connect(): Promise<boolean> {
    try {
      return await this.daemonClient.connect();
    } catch (error) {
      console.error('Failed to connect to daemon:', error);
      return false;
    }
  }

  /**
   * Disconnect from daemon
   */
  public disconnect(): void {
    this.daemonClient.disconnect();
  }

  /**
   * Create a job from template
   */
  public async createJobFromTemplate(templateId: string, customizations?: Partial<CronJobSpec>): Promise<any> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const jobSpec: CronJobSpec = {
      id: customizations?.id || `job_${templateId}_${Date.now()}`,
      name: customizations?.name || template.name,
      description: customizations?.description || template.description,
      command: customizations?.command || template.command,
      schedule: {
        cron: customizations?.schedule?.cron || template.schedule,
        timezone: customizations?.schedule?.timezone,
      },
      environment: customizations?.environment || template.environment,
      workingDirectory: customizations?.workingDirectory || template.workingDirectory,
      priority: customizations?.priority || template.priority,
      tags: customizations?.tags || template.tags,
      maxRetries: customizations?.maxRetries || template.maxRetries,
      timeout: customizations?.timeout || template.timeout,
      databaseSync: true,
    };

    return await this.daemonClient.createDatabaseCronJob(jobSpec);
  }

  /**
   * Create a custom job
   */
  public async createCustomJob(jobSpec: CronJobSpec): Promise<any> {
    return await this.daemonClient.createDatabaseCronJob({
      ...jobSpec,
      databaseSync: true,
    });
  }

  /**
   * List all available templates
   */
  public listTemplates(): CronJobTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  public getTemplate(templateId: string): CronJobTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * List all jobs - overrides BaseJobManager to use daemon client
   * Returns jobs from daemon rather than storage layer
   */
  async listJobs(filter?: Record<string, unknown>): Promise<BaseJobSpec[]> {
    const daemonJobs = await this.daemonClient.listJobs(filter);
    // Daemon jobs are compatible with BaseJobSpec structure
    return daemonJobs as BaseJobSpec[];
  }

  /**
   * Get job execution report
   */
  public async getJobReport(jobId: string): Promise<JobExecutionReport> {
    // Try to get historical data from database if available, otherwise use current job info
    // Using any[] because getJobHistory returns ShellJob (snake_case properties)
    // but getJob returns JobSpec (camelCase properties), and this code handles both
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let jobs: any[] = [];

    try {
      jobs = await this.daemonClient.getJobHistory(jobId, 1000);
    } catch (_error) {
      // Fallback: use current job information for basic report
      const currentJob = await this.daemonClient.getJob(jobId);
      if (currentJob) {
        jobs = [currentJob];
      }
    }

    const executions = jobs.length;
    const successes = jobs.filter(job => job.status === 'completed').length;
    const failures = jobs.filter(job => job.status === 'failed').length;
    const successRate = executions > 0 ? (successes / executions) * 100 : 0;

    const durations = jobs
      .filter(job => job.duration_ms)
      .map(job => job.duration_ms);
    const averageDuration = durations.length > 0
      ? durations.reduce((sum, duration) => sum + duration, 0) / durations.length
      : 0;

    const lastExecution = jobs.length > 0 ? (jobs[0].startedAt || jobs[0].createdAt || jobs[0].started_at)
      ? new Date(jobs[0].startedAt || jobs[0].createdAt || jobs[0].started_at)
      : undefined : undefined;
    const lastSuccess = jobs.find(job => job.status === 'completed')
      ? new Date(jobs.find(job => job.status === 'completed')!.startedAt || jobs.find(job => job.status === 'completed')!.createdAt || jobs.find(job => job.status === 'completed')!.started_at)
      : undefined;
    const lastFailure = jobs.find(job => job.status === 'failed')
      ? new Date(jobs.find(job => job.status === 'failed')!.startedAt || jobs.find(job => job.status === 'failed')!.createdAt || jobs.find(job => job.status === 'failed')!.started_at)
      : undefined;

    // Analyze common errors
    const errorCounts = new Map<string, number>();
    jobs.filter(job => job.status === 'failed' && (job.error || job.stderr)).forEach(job => {
      const error = job.error || job.stderr || 'Unknown error';
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    });

    const commonErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      jobId,
      executions,
      successes,
      failures,
      successRate,
      averageDuration,
      lastExecution,
      lastSuccess,
      lastFailure,
      commonErrors,
    };
  }

  /**
   * Get all job reports
   */
  public async getAllJobReports(): Promise<JobExecutionReport[]> {
    const jobs = await this.daemonClient.listJobs();
    const reports: JobExecutionReport[] = [];

    for (const job of jobs) {
      try {
        const report = await this.getJobReport(job.id);
        reports.push(report);
      } catch (error) {
        console.error(`Failed to get report for job ${job.id}:`, error);
      }
    }

    return reports.sort((a, b) => b.executions - a.executions);
  }

  /**
   * Start a job - implements BaseJobManager abstract method
   * Delegates to daemon client and updates status
   */
  async startJob(jobId: string): Promise<BaseJobSpec> {
    // Delegate to daemon
    const daemonResult = await this.daemonClient.startJob(jobId);

    // Update job status in our storage
    const job = await this.updateJobStatus(jobId, 'running', {
      startedAt: new Date(),
      pid: daemonResult.pid,
    });

    return job;
  }

  /**
   * Stop a job - implements BaseJobManager abstract method
   * Delegates to daemon client and updates status
   */
  async stopJob(jobId: string, signal: string = 'SIGTERM'): Promise<BaseJobSpec> {
    // Delegate to daemon
    await this.daemonClient.stopJob(jobId, signal);

    // Update job status in our storage
    const job = await this.updateJobStatus(jobId, 'stopped', {
      completedAt: new Date(),
    });

    return job;
  }

  /**
   * Remove a job - overrides BaseJobManager to use daemon client
   */
  async removeJob(jobId: string, force: boolean = false): Promise<boolean> {
    const result = await this.daemonClient.removeJob(jobId, force);

    // Also remove from our storage if it exists
    try {
      await this.storage.delete(jobId);
      this.jobs.delete(jobId);
    } catch (_error) {
      // Job may not exist in storage, that's okay
      this.logger.debug(`Job ${jobId} not found in storage during removal`);
    }

    return result;
  }

  /**
   * Get job information - overrides BaseJobManager to use daemon client
   * Returns job from daemon rather than storage layer
   */
  async getJob(jobId: string): Promise<BaseJobSpec | null> {
    const daemonJob = await this.daemonClient.getJob(jobId);
    // Daemon job is compatible with BaseJobSpec structure
    return daemonJob ? (daemonJob as BaseJobSpec) : null;
  }

  /**
   * Get daemon status
   */
  public async getDaemonStatus(): Promise<any> {
    return await this.daemonClient.getStatus();
  }

  /**
   * Generate comprehensive job report
   */
  public async generateComprehensiveReport(): Promise<string> {
    const daemonStatus = await this.getDaemonStatus();
    const jobReports = await this.getAllJobReports();
    const jobs = await this.listJobs();

    let report = `# LSH Cron Job Report\n`;
    report += `Generated: ${new Date().toISOString()}\n\n`;

    report += `## Daemon Status\n`;
    report += `- PID: ${daemonStatus.pid}\n`;
    report += `- Uptime: ${Math.floor(daemonStatus.uptime / 60)} minutes\n`;
    report += `- Memory Usage: ${Math.round(daemonStatus.memoryUsage.heapUsed / 1024 / 1024)} MB\n`;
    report += `- Total Jobs: ${jobs.length}\n`;
    report += `- Running Jobs: ${jobs.filter(j => j.status === 'running').length}\n\n`;

    report += `## Job Summary\n`;
    const totalExecutions = jobReports.reduce((sum, r) => sum + r.executions, 0);
    const totalSuccesses = jobReports.reduce((sum, r) => sum + r.successes, 0);
    const overallSuccessRate = totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0;

    report += `- Total Executions: ${totalExecutions}\n`;
    report += `- Overall Success Rate: ${overallSuccessRate.toFixed(1)}%\n\n`;

    report += `## Individual Job Reports\n`;
    jobReports.forEach(jobReport => {
      report += `### ${jobReport.jobId}\n`;
      report += `- Executions: ${jobReport.executions}\n`;
      report += `- Success Rate: ${jobReport.successRate.toFixed(1)}%\n`;
      report += `- Average Duration: ${Math.round(jobReport.averageDuration)}ms\n`;
      report += `- Last Execution: ${jobReport.lastExecution?.toISOString() || 'Never'}\n`;
      
      if (jobReport.commonErrors.length > 0) {
        report += `- Common Errors:\n`;
        jobReport.commonErrors.forEach(error => {
          report += `  - ${error.error} (${error.count} times)\n`;
        });
      }
      report += `\n`;
    });

    return report;
  }

  /**
   * Export job data
   */
  public async exportJobData(format: 'json' | 'csv' = 'json'): Promise<string> {
    const jobs = await this.daemonClient.listJobs();
    const jobReports = await this.getAllJobReports();

    if (format === 'csv') {
      let csv = 'Job ID,Name,Status,Executions,Success Rate,Last Execution\n';
      jobReports.forEach(report => {
        const job = jobs.find(j => j.id === report.jobId);
        csv += `${report.jobId},"${job?.name || ''}",${job?.status || ''},${report.executions},${report.successRate.toFixed(1)},${report.lastExecution?.toISOString() || ''}\n`;
      });
      return csv;
    } else {
      return JSON.stringify({
        jobs,
        reports: jobReports,
        exportedAt: new Date().toISOString(),
      }, null, 2);
    }
  }

  /**
   * Check if daemon is running
   */
  public isDaemonRunning(): boolean {
    return this.daemonClient.isDaemonRunning();
  }

  /**
   * Check if connected to daemon
   */
  public isConnected(): boolean {
    return this.daemonClient.isConnected();
  }
}

export default CronJobManager;