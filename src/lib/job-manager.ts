/**
 * Job Management System for LSH Shell
 * Supports CRUD operations on shell jobs and system processes
 *
 * REFACTORED: Now extends BaseJobManager to eliminate duplication
 */

import { spawn, exec, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import {
  BaseJobManager,
  BaseJobSpec,
  BaseJobFilter,
} from './base-job-manager.js';
import MemoryJobStorage from './job-storage-memory.js';

const execAsync = promisify(exec);

/**
 * Extended job specification with JobManager-specific fields
 */
export interface JobSpec extends BaseJobSpec {
  type: 'shell' | 'system' | 'scheduled' | 'service';
  ppid?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  maxMemory?: number;
  maxCpu?: number;
  logFile?: string;
  process?: ChildProcess;
  timer?: NodeJS.Timeout;
}

export interface JobFilter extends BaseJobFilter {
  type?: string[];
}

export interface JobUpdate {
  name?: string;
  priority?: number;
  maxMemory?: number;
  maxCpu?: number;
  timeout?: number;
  tags?: string[];
  description?: string;
  schedule?: JobSpec['schedule'];
}

export interface SystemProcess {
  pid: number;
  ppid: number;
  name: string;
  command: string;
  user: string;
  cpu: number;
  memory: number;
  startTime: Date;
  status: string;
}

/**
 * Job monitoring metrics returned by monitorJob
 */
export interface JobMonitoring {
  pid: number;
  ppid: number;
  cpu: number;
  memory: number;
  elapsed: string;
  state: string;
  timestamp: Date;
}

export class JobManager extends BaseJobManager {
  private nextJobId = 1;
  private persistenceFile: string;
  private schedulerInterval?: NodeJS.Timeout;
  private initPromise: Promise<void>;

  constructor(persistenceFile = '/tmp/lsh-jobs.json') {
    super(new MemoryJobStorage(), 'JobManager');
    this.persistenceFile = persistenceFile;
    this.initPromise = this.loadPersistedJobs();
    this.startScheduler();
    this.setupCleanupHandlers();
  }

  /**
   * Wait for initialization to complete
   */
  // TODO(@gwicho38): Review - ready
  async ready(): Promise<void> {
    await this.initPromise;
  }

  /**
   * Create a job and persist to filesystem
   */
  // TODO(@gwicho38): Review - createJob
  async createJob(spec: Partial<JobSpec>): Promise<BaseJobSpec> {
    const job = await super.createJob(spec);
    await this.persistJobs();
    return job;
  }

  /**
   * Update a job and persist to filesystem
   */
  // TODO(@gwicho38): Review - updateJob
  async updateJob(jobId: string, updates: JobUpdate): Promise<BaseJobSpec> {
    const job = await super.updateJob(jobId, updates);
    await this.persistJobs();
    return job;
  }

  /**
   * Remove a job and persist to filesystem
   */
  // TODO(@gwicho38): Review - removeJob
  async removeJob(jobId: string, force: boolean = false): Promise<boolean> {
    const result = await super.removeJob(jobId, force);
    if (result) {
      await this.persistJobs();
    }
    return result;
  }

  /**
   * Update job status and persist to filesystem
   */
  // TODO(@gwicho38): Review - updateJobStatus
  protected async updateJobStatus(
    jobId: string,
    status: BaseJobSpec['status'],
    additionalUpdates?: Partial<BaseJobSpec>
  ): Promise<BaseJobSpec> {
    const job = await super.updateJobStatus(jobId, status, additionalUpdates);
    await this.persistJobs();
    return job;
  }

  /**
   * Start a job (execute it as a process)
   */
  // TODO(@gwicho38): Review - startJob
  async startJob(jobId: string): Promise<BaseJobSpec> {
    const baseJob = await this.getJob(jobId);
    if (!baseJob) {
      throw new Error(`Job ${jobId} not found`);
    }

    const job = baseJob as JobSpec;

    if (job.status === 'running') {
      throw new Error(`Job ${jobId} is already running`);
    }

    try {
      // Spawn the process
      if (job.type === 'shell') {
        job.process = spawn('sh', ['-c', job.command], {
          cwd: job.cwd,
          env: job.env,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } else {
        const [cmd, ...args] = job.command.split(' ');
        job.process = spawn(cmd, args.concat(job.args || []), {
          cwd: job.cwd,
          env: job.env,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      }

      job.pid = job.process.pid;

      // Handle output
      job.process.stdout?.on('data', (data) => {
        job.stdout = (job.stdout || '') + data.toString();
        if (job.logFile) {
          fs.appendFileSync(job.logFile, data);
        }
        this.emit('jobOutput', job.id, 'stdout', data.toString());
      });

      job.process.stderr?.on('data', (data) => {
        job.stderr = (job.stderr || '') + data.toString();
        if (job.logFile) {
          fs.appendFileSync(job.logFile, data);
        }
        this.emit('jobOutput', job.id, 'stderr', data.toString());
      });

      // Handle completion
      job.process.on('exit', async (code, signal) => {
        // Check if job still exists (might have been removed during cleanup)
        const existingJob = await this.getJob(job.id);
        if (!existingJob) {
          this.logger.debug(`Job ${job.id} already removed, skipping status update`);
          return;
        }

        const status = code === 0 ? 'completed' : (signal === 'SIGKILL' ? 'killed' : 'failed');
        await this.updateJobStatus(job.id, status, {
          completedAt: new Date(),
          exitCode: code || undefined,
        });
        this.emit('jobCompleted', job, code, signal);
      });

      // Set timeout if specified
      if (job.timeout) {
        job.timer = setTimeout(() => {
          this.stopJob(job.id, 'SIGKILL');
        }, job.timeout);
      }

      // Update status to running
      const updatedJob = await this.updateJobStatus(job.id, 'running', {
        startedAt: new Date(),
        pid: job.pid,
      });

      return updatedJob;

    } catch (error) {
      const err = error as Error;
      await this.updateJobStatus(job.id, 'failed', {
        completedAt: new Date(),
        stderr: err.message,
      });
      this.emit('jobFailed', job, error);
      throw error;
    }
  }

  /**
   * Stop a running job
   */
  // TODO(@gwicho38): Review - stopJob
  async stopJob(jobId: string, signal: string = 'SIGTERM'): Promise<BaseJobSpec> {
    const baseJob = await this.getJob(jobId);
    if (!baseJob) {
      throw new Error(`Job ${jobId} not found`);
    }

    const job = baseJob as JobSpec;

    if (job.status !== 'running') {
      throw new Error(`Job ${jobId} is not running`);
    }

    if (!job.process || !job.pid) {
      throw new Error(`Job ${jobId} has no associated process`);
    }

    // Clear timeout if exists
    if (job.timer) {
      clearTimeout(job.timer);
      job.timer = undefined;
    }

    // Kill the process
    try {
      job.process.kill(signal as NodeJS.Signals);
    } catch (error) {
      this.logger.error(`Failed to kill job ${jobId}`, error);
    }

    // Update status
    const updatedJob = await this.updateJobStatus(jobId, 'stopped', {
      completedAt: new Date(),
    });

    return updatedJob;
  }

  /**
   * Create and immediately start a job
   */
  // TODO(@gwicho38): Review - runJob
  async runJob(spec: Partial<JobSpec>): Promise<BaseJobSpec> {
    const job = await this.createJob(spec);
    return await this.startJob(job.id);
  }

  /**
   * Pause a job (stop it but keep for later resumption)
   */
  // TODO(@gwicho38): Review - pauseJob
  async pauseJob(jobId: string): Promise<BaseJobSpec> {
    await this.stopJob(jobId, 'SIGSTOP');
    return await this.updateJobStatus(jobId, 'paused');
  }

  /**
   * Resume a paused job
   */
  // TODO(@gwicho38): Review - resumeJob
  async resumeJob(jobId: string): Promise<BaseJobSpec> {
    const baseJob = await this.getJob(jobId);
    if (!baseJob) {
      throw new Error(`Job ${jobId} not found`);
    }

    const job = baseJob as JobSpec;

    if (job.status !== 'paused') {
      throw new Error(`Job ${jobId} is not paused`);
    }

    if (!job.process || !job.pid) {
      throw new Error(`Job ${jobId} has no associated process`);
    }

    // Send SIGCONT to resume
    try {
      job.process.kill('SIGCONT');
      return await this.updateJobStatus(jobId, 'running');
    } catch (error) {
      throw new Error(`Failed to resume job ${jobId}: ${error}`);
    }
  }

  /**
   * Kill a job forcefully
   */
  // TODO(@gwicho38): Review - killJob
  async killJob(jobId: string, signal: string = 'SIGKILL'): Promise<BaseJobSpec> {
    return await this.stopJob(jobId, signal);
  }

  /**
   * Monitor a job's resource usage
   */
  // TODO(@gwicho38): Review - monitorJob
  async monitorJob(jobId: string): Promise<JobMonitoring | null> {
    const baseJob = await this.getJob(jobId);
    if (!baseJob) {
      throw new Error(`Job ${jobId} not found`);
    }

    const job = baseJob as JobSpec;

    if (!job.pid) {
      throw new Error(`Job ${jobId} is not running`);
    }

    try {
      const { stdout } = await execAsync(`ps -p ${job.pid} -o pid,ppid,pcpu,pmem,etime,state`);
      const lines = stdout.split('\n');
      if (lines.length < 2) {
        return null; // Process not found
      }

      const parts = lines[1].trim().split(/\s+/);
      const monitoring = {
        pid: parseInt(parts[0]),
        ppid: parseInt(parts[1]),
        cpu: parseFloat(parts[2]),
        memory: parseFloat(parts[3]),
        elapsed: parts[4],
        state: parts[5],
        timestamp: new Date(),
      };

      // Update job with current resource usage
      job.cpuUsage = monitoring.cpu;
      job.memoryUsage = monitoring.memory;

      this.emit('jobMonitoring', job, monitoring);
      return monitoring;
    } catch (_error) {
      return null; // Process likely terminated
    }
  }

  /**
   * Get system processes
   */
  // TODO(@gwicho38): Review - getSystemProcesses
  async getSystemProcesses(): Promise<SystemProcess[]> {
    try {
      const { stdout } = await execAsync('ps -eo pid,ppid,user,pcpu,pmem,lstart,comm,args');
      const lines = stdout.split('\n').slice(1); // Skip header

      return lines
        .filter(line => line.trim())
        .map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            pid: parseInt(parts[0]),
            ppid: parseInt(parts[1]),
            user: parts[2],
            cpu: parseFloat(parts[3]),
            memory: parseFloat(parts[4]),
            startTime: new Date(parts.slice(5, 9).join(' ')),
            name: parts[9],
            command: parts.slice(10).join(' ') || parts[9],
            status: 'running'
          };
        });
    } catch (error) {
      this.logger.error('Failed to get system processes', error as Error);
      return [];
    }
  }

  /**
   * Get job statistics
   */
  // TODO(@gwicho38): Review - getJobStats
  getJobStats(): {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    running: number;
    completed: number;
    failed: number;
  } {
    const jobs = Array.from(this.jobs.values()) as JobSpec[];
    const stats = {
      total: jobs.length,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      running: jobs.filter(j => j.status === 'running').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
    };

    jobs.forEach(job => {
      stats.byStatus[job.status] = (stats.byStatus[job.status] || 0) + 1;
      stats.byType[job.type] = (stats.byType[job.type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Clean up old jobs
   */
  // TODO(@gwicho38): Review - cleanupJobs
  async cleanupJobs(olderThanHours = 24): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const jobs = await this.listJobs();
    let cleaned = 0;

    for (const job of jobs) {
      if (job.status === 'completed' || job.status === 'failed') {
        if (job.completedAt && job.completedAt < cutoff) {
          await this.removeJob(job.id, true);
          cleaned++;
        }
      }
    }

    this.logger.info(`Cleaned up ${cleaned} old jobs`);
    return cleaned;
  }

  // ================================
  // PRIVATE: Persistence & Scheduling
  // ================================

  // TODO(@gwicho38): Review - loadPersistedJobs

  // TODO(@gwicho38): Review - loadPersistedJobs
  private async loadPersistedJobs(): Promise<void> {
    try {
      if (fs.existsSync(this.persistenceFile)) {
        const data = fs.readFileSync(this.persistenceFile, 'utf8');

        // Handle empty file
        if (!data || data.trim() === '') {
          this.logger.info('Persistence file is empty, starting fresh');
          return;
        }

        const persistedJobs = JSON.parse(data) as JobSpec[];

        for (const job of persistedJobs) {
          // Convert date strings back to Date objects
          job.createdAt = new Date(job.createdAt);
          if (job.startedAt) job.startedAt = new Date(job.startedAt);
          if (job.completedAt) job.completedAt = new Date(job.completedAt);

          // Don't restore running processes - mark them as stopped
          if (job.status === 'running') {
            job.status = 'stopped';
          }

          await this.storage.save(job);
          this.jobs.set(job.id, job);
        }

        this.logger.info(`Loaded ${persistedJobs.length} persisted jobs`);
      }
    } catch (error) {
      this.logger.error('Failed to load persisted jobs', error as Error);
    }
  }

  // TODO(@gwicho38): Review - persistJobs

  // TODO(@gwicho38): Review - persistJobs
  private async persistJobs(): Promise<void> {
    try {
      const jobs = Array.from(this.jobs.values()).map(job => {
        const { process: _process, timer: _timer, ...serializable } = job as JobSpec;
        return serializable;
      });

      // Write with secure permissions (mode 0o600 = rw-------)
      fs.writeFileSync(this.persistenceFile, JSON.stringify(jobs, null, 2), { mode: 0o600 });
    } catch (error) {
      this.logger.error('Failed to persist jobs', error as Error);
    }
  }

  // TODO(@gwicho38): Review - startScheduler

  // TODO(@gwicho38): Review - startScheduler
  private startScheduler(): void {
    // Check for scheduled jobs every minute
    this.schedulerInterval = setInterval(() => {
      this.checkScheduledJobs();
    }, 60000);

    // Run immediately on startup
    this.checkScheduledJobs();
  }

  // TODO(@gwicho38): Review - checkScheduledJobs

  // TODO(@gwicho38): Review - checkScheduledJobs
  private async checkScheduledJobs(): Promise<void> {
    const jobs = await this.listJobs({ status: 'created' });
    const now = new Date();

    for (const job of jobs as JobSpec[]) {
      if (job.schedule?.nextRun && job.schedule.nextRun <= now) {
        this.logger.info(`Starting scheduled job: ${job.id}`);
        try {
          await this.startJob(job.id);

          // Calculate next run time
          if (job.schedule.interval) {
            job.schedule.nextRun = new Date(now.getTime() + job.schedule.interval);
            await this.updateJob(job.id, { schedule: job.schedule });
          }
        } catch (error) {
          this.logger.error(`Failed to start scheduled job ${job.id}`, error as Error);
        }
      }
    }
  }

  // TODO(@gwicho38): Review - setupCleanupHandlers

  // TODO(@gwicho38): Review - setupCleanupHandlers
  private setupCleanupHandlers(): void {
    // TODO(@gwicho38): Review - cleanup
    const cleanup = async () => {
      this.logger.info('JobManager shutting down...');
      if (this.schedulerInterval) {
        clearInterval(this.schedulerInterval);
      }

      // Stop all running jobs
      const jobs = await this.listJobs({ status: 'running' });
      for (const job of jobs) {
        try {
          await this.stopJob(job.id);
        } catch (error) {
          this.logger.error(`Failed to stop job ${job.id}`, error as Error);
        }
      }

      await this.persistJobs();
      await this.cleanup();
    };

    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
  }

  /**
   * Override cleanup to include scheduler
   */
  // TODO(@gwicho38): Review - cleanup
  async cleanup(): Promise<void> {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }
    await super.cleanup();
  }
}

export default JobManager;
