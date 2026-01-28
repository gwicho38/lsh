/**
 * Job Registry - Comprehensive job execution history and analytics
 * Tracks all job runs with detailed pass/failure history, output logs, and performance metrics
 *
 * REFACTORED: Now extends BaseJobManager for unified interface
 * Note: This is a read-only tracker - startJob/stopJob only record events
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { BaseJobManager, BaseJobSpec } from '../lib/base-job-manager.js';
import MemoryJobStorage from '../lib/job-storage-memory.js';
import { JobSpec } from '../lib/job-manager.js';
import { ENV_VARS, DEFAULTS, PATHS } from '../constants/index.js';

export interface JobExecutionRecord {
  executionId: string;
  jobId: string;
  jobName: string;
  command: string;

  // Execution details
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  status: 'running' | 'completed' | 'failed' | 'killed' | 'timeout';
  exitCode?: number;
  signal?: string;

  // Process information
  pid?: number;
  ppid?: number;

  // Output and logs
  stdout: string;
  stderr: string;
  outputSize: number;
  logFile?: string;

  // Resource usage
  maxMemory?: number;    // Peak memory usage in MB
  avgCpu?: number;       // Average CPU usage percentage
  diskUsage?: number;    // Disk I/O in MB

  // Environment
  environment: Record<string, string>;
  workingDirectory: string;
  user: string;
  hostname: string;

  // Metadata
  tags: string[];
  priority: number;
  scheduled: boolean;    // Was this a scheduled execution?
  retryCount: number;    // Number of times this execution was retried
  parentJobId?: string;  // If this was spawned from another job

  // Error details (if failed)
  errorType?: string;
  errorMessage?: string;
  stackTrace?: string;
}

export interface JobStatistics {
  jobId: string;
  jobName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  killedExecutions: number;
  successRate: number; // percentage

  // Timing statistics
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  totalRuntime: number;

  // Resource statistics
  averageMemory: number;
  maxMemoryUsed: number;
  averageCpuUsage: number;

  // Recent activity
  lastExecution?: Date;
  lastSuccess?: Date;
  lastFailure?: Date;
  recentTrend: 'improving' | 'degrading' | 'stable';

  // Failure analysis
  commonFailures: Array<{ error: string; count: number; percentage: number }>;
  failurePattern?: string; // Pattern in failures (e.g., "fails every 3rd run")
}

export interface JobRegistryConfig {
  registryFile: string;
  maxRecordsPerJob: number;
  maxTotalRecords: number;
  compressionEnabled: boolean;
  metricsRetentionDays: number;
  outputLogDir: string;
  indexingEnabled: boolean;
}

/**
 * Serialized version of JobExecutionRecord (dates as strings from JSON)
 */
interface SerializedJobExecutionRecord extends Omit<JobExecutionRecord, 'startTime' | 'endTime'> {
  startTime: string;
  endTime?: string;
}

/**
 * Serialized version of JobStatistics (dates as strings from JSON)
 */
interface SerializedJobStatistics extends Omit<JobStatistics, 'lastExecution' | 'lastSuccess' | 'lastFailure'> {
  lastExecution?: string;
  lastSuccess?: string;
  lastFailure?: string;
}

export class JobRegistry extends BaseJobManager {
  private config: JobRegistryConfig;
  private records = new Map<string, JobExecutionRecord[]>(); // jobId -> execution records
  private index = new Map<string, Set<string>>(); // tag -> jobIds
  private statistics = new Map<string, JobStatistics>(); // jobId -> stats

  constructor(config?: Partial<JobRegistryConfig>) {
    super(new MemoryJobStorage(), 'JobRegistry');

    this.config = {
      registryFile: PATHS.JOB_REGISTRY_FILE,
      maxRecordsPerJob: DEFAULTS.MAX_RECORDS_PER_JOB,
      maxTotalRecords: DEFAULTS.MAX_TOTAL_RECORDS,
      compressionEnabled: true,
      metricsRetentionDays: DEFAULTS.METRICS_RETENTION_DAYS,
      outputLogDir: PATHS.JOB_LOGS_DIR,
      indexingEnabled: true,
      ...config
    };

    this.ensureLogDirectory();
    this.loadRegistry();
  }

  /**
   * Record the start of a job execution
   */
  // TODO(@gwicho38): Review - recordJobStart
  recordJobStart(job: JobSpec, executionId?: string): JobExecutionRecord {
    const record: JobExecutionRecord = {
      executionId: executionId || this.generateExecutionId(),
      jobId: job.id,
      jobName: job.name,
      command: job.command,
      startTime: new Date(),
      status: 'running',
      stdout: '',
      stderr: '',
      outputSize: 0,
      environment: { ...(job.env || {}) },
      workingDirectory: job.cwd || process.cwd(),
      user: job.user || process.env[ENV_VARS.USER] || 'unknown',
      hostname: os.hostname(),
      tags: [...(job.tags || [])],
      priority: job.priority || 5,
      scheduled: job.type === 'scheduled',
      retryCount: 0,
      pid: job.pid,
      ppid: job.ppid
    };

    // Store output logs in separate files for large outputs
    if (this.config.outputLogDir) {
      record.logFile = path.join(
        this.config.outputLogDir,
        `${record.executionId}.log`
      );
    }

    this.addRecord(record);
    this.emit('executionStarted', record);

    return record;
  }

  /**
   * Record job output (stdout/stderr)
   */
  // TODO(@gwicho38): Review - recordJobOutput
  recordJobOutput(executionId: string, type: 'stdout' | 'stderr', data: string): void {
    const record = this.findRecordByExecutionId(executionId);
    if (!record) return;

    if (type === 'stdout') {
      record.stdout += data;
    } else {
      record.stderr += data;
    }

    record.outputSize += data.length;

    // Write to log file if configured
    if (record.logFile) {
      const logEntry = `[${new Date().toISOString()}] ${type.toUpperCase()}: ${data}`;
      fs.appendFileSync(record.logFile, logEntry);
    }

    this.emit('outputRecorded', executionId, type, data);
  }

  /**
   * Record job completion
   */
  // TODO(@gwicho38): Review - recordJobCompletion
  recordJobCompletion(
    executionId: string,
    status: JobExecutionRecord['status'],
    exitCode?: number,
    signal?: string,
    error?: Error
  ): void {
    const record = this.findRecordByExecutionId(executionId);
    if (!record) return;

    record.endTime = new Date();
    record.duration = record.endTime.getTime() - record.startTime.getTime();
    record.status = status;
    record.exitCode = exitCode;
    record.signal = signal;

    if (error) {
      record.errorType = error.constructor.name;
      record.errorMessage = error.message;
      record.stackTrace = error.stack;
    }

    // Record resource usage
    this.recordResourceUsage(record);

    this.updateJobStatistics(record);
    this.saveRegistry();

    this.emit('executionCompleted', record);
  }

  /**
   * Get execution history for a job - overrides BaseJobManager
   * Returns JobExecutionRecord[] which is compatible with BaseJobExecution[]
   */
  // TODO(@gwicho38): Review - getJobHistory
  async getJobHistory(jobId: string, limit: number = 50): Promise<JobExecutionRecord[]> {
    const records = this.records.get(jobId) || [];
    return limit ? records.slice(0, limit) : records;
  }

  /**
   * Get job statistics - overrides BaseJobManager
   * Returns JobStatistics which is compatible with BaseJobStatistics
   */
  // TODO(@gwicho38): Review - getJobStatistics
  async getJobStatistics(jobId: string): Promise<JobStatistics> {
    const stats = this.statistics.get(jobId);
    if (!stats) {
      throw new Error(`No statistics found for job ${jobId}`);
    }
    return stats;
  }

  /**
   * Get all job statistics
   */
  // TODO(@gwicho38): Review - getAllStatistics
  getAllStatistics(): JobStatistics[] {
    return Array.from(this.statistics.values());
  }

  /**
   * Search job executions
   */
  // TODO(@gwicho38): Review - searchExecutions
  searchExecutions(criteria: {
    jobId?: string;
    status?: string[];
    startTime?: { from?: Date; to?: Date };
    duration?: { min?: number; max?: number };
    tags?: string[];
    user?: string;
    command?: RegExp;
    exitCode?: number[];
    limit?: number;
  }): JobExecutionRecord[] {
    let results: JobExecutionRecord[] = [];

    // Collect all records
    for (const records of this.records.values()) {
      results.push(...records);
    }

    // Apply filters
    if (criteria.jobId) {
      results = results.filter(r => r.jobId === criteria.jobId);
    }

    if (criteria.status) {
      results = results.filter(r => criteria.status!.includes(r.status));
    }

    if (criteria.startTime) {
      if (criteria.startTime.from) {
        results = results.filter(r => r.startTime >= criteria.startTime!.from!);
      }
      if (criteria.startTime.to) {
        results = results.filter(r => r.startTime <= criteria.startTime!.to!);
      }
    }

    if (criteria.duration) {
      if (criteria.duration.min && criteria.duration.max) {
        results = results.filter(r =>
          r.duration &&
          r.duration >= criteria.duration!.min! &&
          r.duration <= criteria.duration!.max!
        );
      }
    }

    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter(r =>
        criteria.tags!.some(tag => r.tags.includes(tag))
      );
    }

    if (criteria.user) {
      results = results.filter(r => r.user === criteria.user);
    }

    if (criteria.command) {
      results = results.filter(r => criteria.command!.test(r.command));
    }

    if (criteria.exitCode) {
      results = results.filter(r =>
        r.exitCode !== undefined &&
        criteria.exitCode!.includes(r.exitCode)
      );
    }

    // Sort by start time (newest first)
    results.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    // Apply limit
    if (criteria.limit) {
      results = results.slice(0, criteria.limit);
    }

    return results;
  }

  /**
   * Generate execution report
   */
  // TODO(@gwicho38): Review - generateReport
  async generateReport(options: {
    jobId?: string;
    timeRange?: { from: Date; to: Date };
    format?: 'json' | 'text' | 'csv';
  } = {}): Promise<string> {
    const { jobId, timeRange, format = 'text' } = options;

    let records: JobExecutionRecord[] = [];

    if (jobId) {
      records = await this.getJobHistory(jobId);
    } else {
      for (const jobRecords of this.records.values()) {
        records.push(...jobRecords);
      }
    }

    if (timeRange) {
      records = records.filter(r =>
        r.startTime >= timeRange.from && r.startTime <= timeRange.to
      );
    }

    switch (format) {
      case 'json':
        return JSON.stringify(records, null, 2);

      case 'csv':
        return this.generateCSVReport(records);

      case 'text':
      default:
        return this.generateTextReport(records);
    }
  }

  /**
   * Clean old records - overrides BaseJobManager
   */
  // TODO(@gwicho38): Review - cleanup
  async cleanup(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.metricsRetentionDays);

    let removedCount = 0;

    for (const [jobId, records] of this.records) {
      const filteredRecords = records.filter(r => r.startTime >= cutoffDate);
      const removed = records.length - filteredRecords.length;

      if (removed > 0) {
        this.records.set(jobId, filteredRecords);
        removedCount += removed;

        // Clean up log files for removed records
        records
          .filter(r => r.startTime < cutoffDate)
          .forEach(r => {
            if (r.logFile && fs.existsSync(r.logFile)) {
              fs.unlinkSync(r.logFile);
            }
          });
      }

      // Limit records per job
      if (filteredRecords.length > this.config.maxRecordsPerJob) {
        const limited = filteredRecords.slice(0, this.config.maxRecordsPerJob);
        this.records.set(jobId, limited);
        removedCount += filteredRecords.length - limited.length;
      }
    }

    this.saveRegistry();
    this.logger.info(`Cleaned up ${removedCount} old records`);

    // Call base cleanup
    await super.cleanup();
  }

  /**
   * Export registry data
   */
  // TODO(@gwicho38): Review - export
  export(filePath: string, format: 'json' | 'csv' = 'json'): void {
    const allRecords = Array.from(this.records.values()).flat();

    let content: string;
    if (format === 'csv') {
      content = this.generateCSVReport(allRecords);
    } else {
      content = JSON.stringify({
        records: allRecords,
        statistics: Array.from(this.statistics.values()),
        exportedAt: new Date().toISOString()
      }, null, 2);
    }

    fs.writeFileSync(filePath, content);
  }

  // TODO(@gwicho38): Review - addRecord

  // TODO(@gwicho38): Review - addRecord
  private addRecord(record: JobExecutionRecord): void {
    const jobRecords = this.records.get(record.jobId) || [];
    jobRecords.unshift(record); // Add to beginning (newest first)

    // Limit records per job
    if (jobRecords.length > this.config.maxRecordsPerJob) {
      const removed = jobRecords.splice(this.config.maxRecordsPerJob);
      // Clean up log files for removed records
      removed.forEach(r => {
        if (r.logFile && fs.existsSync(r.logFile)) {
          fs.unlinkSync(r.logFile);
        }
      });
    }

    this.records.set(record.jobId, jobRecords);

    // Update index
    if (this.config.indexingEnabled) {
      record.tags.forEach(tag => {
        const jobIds = this.index.get(tag) || new Set();
        jobIds.add(record.jobId);
        this.index.set(tag, jobIds);
      });
    }
  }

  // TODO(@gwicho38): Review - findRecordByExecutionId

  // TODO(@gwicho38): Review - findRecordByExecutionId
  private findRecordByExecutionId(executionId: string): JobExecutionRecord | undefined {
    for (const records of this.records.values()) {
      const record = records.find(r => r.executionId === executionId);
      if (record) return record;
    }
    return undefined;
  }

  // TODO(@gwicho38): Review - updateJobStatistics

  // TODO(@gwicho38): Review - updateJobStatistics
  private updateJobStatistics(record: JobExecutionRecord): void {
    const stats = this.statistics.get(record.jobId) || this.createInitialStatistics(record);

    stats.totalExecutions++;

    switch (record.status) {
      case 'completed':
        stats.successfulExecutions++;
        stats.lastSuccess = record.endTime;
        break;
      case 'failed':
        stats.failedExecutions++;
        stats.lastFailure = record.endTime;
        this.updateFailureAnalysis(stats, record);
        break;
      case 'killed':
        stats.killedExecutions++;
        break;
    }

    stats.successRate = (stats.successfulExecutions / stats.totalExecutions) * 100;
    stats.lastExecution = record.endTime;

    // Update timing statistics
    if (record.duration) {
      stats.totalRuntime += record.duration;
      stats.averageDuration = stats.totalRuntime / stats.totalExecutions;

      if (stats.minDuration === 0 || record.duration < stats.minDuration) {
        stats.minDuration = record.duration;
      }
      if (record.duration > stats.maxDuration) {
        stats.maxDuration = record.duration;
      }
    }

    // Update resource statistics
    if (record.maxMemory) {
      stats.averageMemory = (stats.averageMemory * (stats.totalExecutions - 1) + record.maxMemory) / stats.totalExecutions;
      if (record.maxMemory > stats.maxMemoryUsed) {
        stats.maxMemoryUsed = record.maxMemory;
      }
    }

    if (record.avgCpu) {
      stats.averageCpuUsage = (stats.averageCpuUsage * (stats.totalExecutions - 1) + record.avgCpu) / stats.totalExecutions;
    }

    // Determine trend
    stats.recentTrend = this.calculateTrend(record.jobId);

    this.statistics.set(record.jobId, stats);
  }

  // TODO(@gwicho38): Review - createInitialStatistics

  // TODO(@gwicho38): Review - createInitialStatistics
  private createInitialStatistics(record: JobExecutionRecord): JobStatistics {
    return {
      jobId: record.jobId,
      jobName: record.jobName,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      killedExecutions: 0,
      successRate: 0,
      averageDuration: 0,
      minDuration: 0,
      maxDuration: 0,
      totalRuntime: 0,
      averageMemory: 0,
      maxMemoryUsed: 0,
      averageCpuUsage: 0,
      recentTrend: 'stable',
      commonFailures: []
    };
  }

  // TODO(@gwicho38): Review - updateFailureAnalysis

  // TODO(@gwicho38): Review - updateFailureAnalysis
  private updateFailureAnalysis(stats: JobStatistics, record: JobExecutionRecord): void {
    if (!record.errorMessage) return;

    const existing = stats.commonFailures.find(f => f.error === record.errorMessage);
    if (existing) {
      existing.count++;
    } else {
      stats.commonFailures.push({
        error: record.errorMessage,
        count: 1,
        percentage: 0
      });
    }

    // Update percentages
    const totalFailures = stats.commonFailures.reduce((sum, f) => sum + f.count, 0);
    stats.commonFailures.forEach(f => {
      f.percentage = (f.count / totalFailures) * 100;
    });

    // Sort by frequency
    stats.commonFailures.sort((a, b) => b.count - a.count);

    // Keep only top 10 failure types
    stats.commonFailures = stats.commonFailures.slice(0, 10);
  }

  // TODO(@gwicho38): Review - calculateTrend

  // TODO(@gwicho38): Review - calculateTrend
  private calculateTrend(jobId: string): 'improving' | 'degrading' | 'stable' {
    const records = this.records.get(jobId) || [];
    if (records.length < 5) return 'stable';

    const recent = records.slice(0, 5);
    const successCount = recent.filter(r => r.status === 'completed').length;
    const _failureCount = recent.filter(r => r.status === 'failed').length;

    const recentSuccessRate = successCount / recent.length;
    const overallStats = this.statistics.get(jobId);

    if (!overallStats) return 'stable';

    const overallSuccessRate = overallStats.successRate / 100;

    if (recentSuccessRate > overallSuccessRate + 0.1) {
      return 'improving';
    } else if (recentSuccessRate < overallSuccessRate - 0.1) {
      return 'degrading';
    } else {
      return 'stable';
    }
  }

  // TODO(@gwicho38): Review - recordResourceUsage

  // TODO(@gwicho38): Review - recordResourceUsage
  private recordResourceUsage(record: JobExecutionRecord): void {
    if (!record.pid) return;

    try {
      exec(`ps -p ${record.pid} -o %mem,%cpu`, (error: unknown, stdout: string) => {
        if (!error && stdout) {
          const lines = stdout.trim().split('\n');
          if (lines.length > 1) {
            const [mem, cpu] = lines[1].trim().split(/\s+/).map(parseFloat);
            record.maxMemory = mem;
            record.avgCpu = cpu;
          }
        }
      });
    } catch (_error) {
      // Ignore resource monitoring errors
    }
  }

  // TODO(@gwicho38): Review - generateExecutionId

  // TODO(@gwicho38): Review - generateExecutionId
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // TODO(@gwicho38): Review - generateTextReport

  // TODO(@gwicho38): Review - generateTextReport
  private generateTextReport(records: JobExecutionRecord[]): string {
    let report = `Job Execution Report\n`;
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Total Executions: ${records.length}\n\n`;

    const byStatus = records.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    report += `Status Summary:\n`;
    Object.entries(byStatus).forEach(([status, count]) => {
      report += `  ${status}: ${count}\n`;
    });

    report += `\nRecent Executions:\n`;
    records.slice(0, 20).forEach(r => {
      report += `${r.startTime.toISOString()} | ${r.jobName} | ${r.status} | ${r.duration || 0}ms\n`;
    });

    return report;
  }

  // TODO(@gwicho38): Review - generateCSVReport

  // TODO(@gwicho38): Review - generateCSVReport
  private generateCSVReport(records: JobExecutionRecord[]): string {
    const headers = [
      'executionId', 'jobId', 'jobName', 'command', 'startTime', 'endTime',
      'duration', 'status', 'exitCode', 'user', 'hostname', 'outputSize'
    ];

    let csv = headers.join(',') + '\n';

    records.forEach(r => {
      const values = [
        r.executionId,
        r.jobId,
        r.jobName,
        `"${r.command}"`,
        r.startTime.toISOString(),
        r.endTime?.toISOString() || '',
        r.duration || '',
        r.status,
        r.exitCode || '',
        r.user,
        r.hostname,
        r.outputSize
      ];
      csv += values.join(',') + '\n';
    });

    return csv;
  }

  // TODO(@gwicho38): Review - ensureLogDirectory

  // TODO(@gwicho38): Review - ensureLogDirectory
  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.config.outputLogDir)) {
      fs.mkdirSync(this.config.outputLogDir, { recursive: true });
    }
  }

  // TODO(@gwicho38): Review - loadRegistry

  // TODO(@gwicho38): Review - loadRegistry
  private loadRegistry(): void {
    try {
      if (fs.existsSync(this.config.registryFile)) {
        const data = JSON.parse(fs.readFileSync(this.config.registryFile, 'utf8'));

        // Restore records
        if (data.records) {
          for (const [jobId, records] of Object.entries(data.records)) {
            const serializedRecords = records as SerializedJobExecutionRecord[];
            this.records.set(jobId, serializedRecords.map(r => ({
              ...r,
              startTime: new Date(r.startTime),
              endTime: r.endTime ? new Date(r.endTime) : undefined
            })));
          }
        }

        // Restore statistics
        if (data.statistics) {
          for (const [jobId, stats] of Object.entries(data.statistics)) {
            const s = stats as SerializedJobStatistics;
            this.statistics.set(jobId, {
              ...s,
              lastExecution: s.lastExecution ? new Date(s.lastExecution) : undefined,
              lastSuccess: s.lastSuccess ? new Date(s.lastSuccess) : undefined,
              lastFailure: s.lastFailure ? new Date(s.lastFailure) : undefined
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to load job registry', error as Error);
    }
  }

  // TODO(@gwicho38): Review - saveRegistry

  // TODO(@gwicho38): Review - saveRegistry
  private saveRegistry(): void {
    try {
      const data = {
        records: Object.fromEntries(this.records),
        statistics: Object.fromEntries(this.statistics),
        savedAt: new Date().toISOString()
      };

      fs.writeFileSync(this.config.registryFile, JSON.stringify(data, null, 2));
    } catch (error) {
      this.logger.error('Failed to save job registry', error as Error);
    }
  }

  /**
   * Start job - implements BaseJobManager abstract method
   * JobRegistry is read-only, so this records the start event
   */
  // TODO(@gwicho38): Review - startJob
  async startJob(jobId: string): Promise<BaseJobSpec> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in registry`);
    }

    // Record execution start
    this.recordJobStart(job as JobSpec);

    // Update job status
    return await this.updateJobStatus(jobId, 'running', {
      startedAt: new Date(),
    });
  }

  /**
   * Stop job - implements BaseJobManager abstract method
   * JobRegistry is read-only, so this records the stop event
   */
  // TODO(@gwicho38): Review - stopJob
  async stopJob(jobId: string, _signal?: string): Promise<BaseJobSpec> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in registry`);
    }

    // Update job status
    return await this.updateJobStatus(jobId, 'stopped', {
      completedAt: new Date(),
    });
  }
}

export default JobRegistry;