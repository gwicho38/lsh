/**
 * Comprehensive Job Management System for LSH Shell
 * Supports CRUD operations on shell jobs and system processes
 */

import { spawn, exec, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as _path from 'path';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

export interface JobSpec {
  id: string;
  name: string;
  command: string;
  args?: string[];
  type: 'shell' | 'system' | 'scheduled' | 'service';
  status: 'created' | 'running' | 'stopped' | 'completed' | 'failed' | 'killed';
  priority: number; // -20 to 19 (like nice values)

  // Process information
  pid?: number;
  ppid?: number;

  // Timing
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Resource usage
  cpuUsage?: number;
  memoryUsage?: number;

  // Configuration
  env?: Record<string, string>;
  cwd?: string;
  user?: string;

  // Limits
  maxMemory?: number;
  maxCpu?: number;
  timeout?: number;

  // Scheduling (for scheduled jobs)
  schedule?: {
    cron?: string;
    interval?: number; // milliseconds
    nextRun?: Date;
  };

  // Output handling
  stdout?: string;
  stderr?: string;
  logFile?: string;

  // Metadata
  tags: string[];
  description?: string;

  // Internal
  process?: ChildProcess;
  timer?: NodeJS.Timeout;
}

export interface JobFilter {
  status?: string[];
  type?: string[];
  tags?: string[];
  user?: string;
  namePattern?: RegExp;
  createdAfter?: Date;
  createdBefore?: Date;
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

export class JobManager extends EventEmitter {
  private jobs = new Map<string, JobSpec>();
  private nextJobId = 1;
  private persistenceFile: string;
  private schedulerInterval?: NodeJS.Timeout;

  constructor(persistenceFile = '/tmp/lsh-jobs.json') {
    super();
    this.persistenceFile = persistenceFile;
    this.loadPersistedJobs();
    this.startScheduler();
    this.setupCleanupHandlers();
  }

  // ================================
  // CREATE Operations
  // ================================

  /**
   * Create a new job
   */
  async createJob(spec: Partial<JobSpec>): Promise<JobSpec> {
    const job: JobSpec = {
      id: spec.id || `job_${this.nextJobId++}`,
      name: spec.name || `Job ${this.nextJobId - 1}`,
      command: spec.command || '',
      args: spec.args || [],
      type: spec.type || 'shell',
      status: 'created',
      priority: spec.priority || 0,
      createdAt: new Date(),
      env: {
        ...Object.fromEntries(
          Object.entries(process.env).filter(([_, v]) => v !== undefined)
        ),
        ...spec.env
      } as Record<string, string>,
      cwd: spec.cwd || process.cwd(),
      user: spec.user || process.env.USER || 'unknown',
      tags: spec.tags || [],
      description: spec.description,
      maxMemory: spec.maxMemory,
      maxCpu: spec.maxCpu,
      timeout: spec.timeout,
      schedule: spec.schedule,
      logFile: spec.logFile,
    };

    // Validate job specification
    if (!job.command) {
      throw new Error('Job command is required');
    }

    this.jobs.set(job.id, job);
    this.emit('jobCreated', job);
    await this.persistJobs();

    return job;
  }

  /**
   * Start a job (execute it)
   */
  async startJob(jobId: string): Promise<JobSpec> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === 'running') {
      throw new Error(`Job ${jobId} is already running`);
    }

    job.status = 'running';
    job.startedAt = new Date();
    job.stdout = '';
    job.stderr = '';

    try {
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
      job.process.on('exit', (code, signal) => {
        job.completedAt = new Date();
        if (code === 0) {
          job.status = 'completed';
        } else {
          job.status = signal === 'SIGKILL' ? 'killed' : 'failed';
        }
        this.emit('jobCompleted', job, code, signal);
        this.persistJobs();
      });

      // Set timeout if specified
      if (job.timeout) {
        job.timer = setTimeout(() => {
          this.killJob(job.id, 'SIGKILL');
        }, job.timeout);
      }

      this.emit('jobStarted', job);
      await this.persistJobs();

      return job;
    } catch (error) {
      job.status = 'failed';
      job.stderr = error.message;
      job.completedAt = new Date();
      this.emit('jobFailed', job, error);
      await this.persistJobs();
      throw error;
    }
  }

  /**
   * Create and immediately start a job
   */
  async runJob(spec: Partial<JobSpec>): Promise<JobSpec> {
    const job = await this.createJob(spec);
    return await this.startJob(job.id);
  }

  // ================================
  // READ Operations
  // ================================

  /**
   * Get a specific job
   */
  getJob(jobId: string): JobSpec | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * List all jobs with optional filtering
   */
  listJobs(filter?: JobFilter): JobSpec[] {
    let jobs = Array.from(this.jobs.values());

    if (filter) {
      if (filter.status) {
        jobs = jobs.filter(job => filter.status!.includes(job.status));
      }
      if (filter.type) {
        jobs = jobs.filter(job => filter.type!.includes(job.type));
      }
      if (filter.tags && filter.tags.length > 0) {
        jobs = jobs.filter(job =>
          filter.tags!.some(tag => job.tags.includes(tag))
        );
      }
      if (filter.user) {
        jobs = jobs.filter(job => job.user === filter.user);
      }
      if (filter.namePattern) {
        jobs = jobs.filter(job => filter.namePattern!.test(job.name));
      }
      if (filter.createdAfter) {
        jobs = jobs.filter(job => job.createdAt >= filter.createdAfter!);
      }
      if (filter.createdBefore) {
        jobs = jobs.filter(job => job.createdAt <= filter.createdBefore!);
      }
    }

    return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get job statistics
   */
  getJobStats(): any {
    const jobs = Array.from(this.jobs.values());
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
   * Get system processes
   */
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
      console.error('Failed to get system processes:', error);
      return [];
    }
  }

  /**
   * Monitor a job's resource usage
   */
  async monitorJob(jobId: string): Promise<any> {
    const job = this.jobs.get(jobId);
    if (!job || !job.pid) {
      throw new Error(`Job ${jobId} not found or not running`);
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

  // ================================
  // UPDATE Operations
  // ================================

  /**
   * Update job properties
   */
  async updateJob(jobId: string, updates: JobUpdate): Promise<JobSpec> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Apply updates
    if (updates.name !== undefined) job.name = updates.name;
    if (updates.priority !== undefined) {
      job.priority = Math.max(-20, Math.min(19, updates.priority));

      // Apply priority to running process
      if (job.pid && job.status === 'running') {
        try {
          await execAsync(`renice ${job.priority} ${job.pid}`);
        } catch (error) {
          console.warn(`Failed to renice process ${job.pid}:`, error.message);
        }
      }
    }
    if (updates.maxMemory !== undefined) job.maxMemory = updates.maxMemory;
    if (updates.maxCpu !== undefined) job.maxCpu = updates.maxCpu;
    if (updates.timeout !== undefined) job.timeout = updates.timeout;
    if (updates.tags !== undefined) job.tags = updates.tags;
    if (updates.description !== undefined) job.description = updates.description;
    if (updates.schedule !== undefined) job.schedule = updates.schedule;

    this.emit('jobUpdated', job);
    await this.persistJobs();

    return job;
  }

  /**
   * Pause a running job
   */
  async pauseJob(jobId: string): Promise<JobSpec> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== 'running' || !job.pid) {
      throw new Error(`Job ${jobId} is not running`);
    }

    try {
      process.kill(job.pid, 'SIGSTOP');
      job.status = 'stopped';
      this.emit('jobPaused', job);
      await this.persistJobs();
      return job;
    } catch (error) {
      throw new Error(`Failed to pause job ${jobId}: ${error.message}`);
    }
  }

  /**
   * Resume a paused job
   */
  async resumeJob(jobId: string): Promise<JobSpec> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== 'stopped' || !job.pid) {
      throw new Error(`Job ${jobId} is not paused`);
    }

    try {
      process.kill(job.pid, 'SIGCONT');
      job.status = 'running';
      this.emit('jobResumed', job);
      await this.persistJobs();
      return job;
    } catch (error) {
      throw new Error(`Failed to resume job ${jobId}: ${error.message}`);
    }
  }

  // ================================
  // DELETE Operations
  // ================================

  /**
   * Kill a running job
   */
  async killJob(jobId: string, signal: string = 'SIGTERM'): Promise<JobSpec> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.timer) {
      clearTimeout(job.timer);
      job.timer = undefined;
    }

    if (job.pid && (job.status === 'running' || job.status === 'stopped')) {
      try {
        process.kill(job.pid, signal);
        job.status = 'killed';
        job.completedAt = new Date();
        this.emit('jobKilled', job, signal);
        await this.persistJobs();
      } catch (error) {
        if (error.code !== 'ESRCH') { // Process not found is OK
          throw new Error(`Failed to kill job ${jobId}: ${error.message}`);
        }
      }
    }

    return job;
  }

  /**
   * Remove a job from the job list
   */
  async removeJob(jobId: string, force = false): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (!force && (job.status === 'running' || job.status === 'stopped')) {
      throw new Error(`Job ${jobId} is still running. Use force=true to kill and remove.`);
    }

    if (force && (job.status === 'running' || job.status === 'stopped')) {
      await this.killJob(jobId, 'SIGKILL');
    }

    this.jobs.delete(jobId);
    this.emit('jobRemoved', job);
    await this.persistJobs();

    return true;
  }

  /**
   * Clean up completed/failed jobs
   */
  async cleanupJobs(olderThanHours = 24): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const toRemove: string[] = [];

    for (const [id, job] of this.jobs) {
      if ((job.status === 'completed' || job.status === 'failed' || job.status === 'killed') &&
          job.completedAt && job.completedAt < cutoff) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      await this.removeJob(id);
    }

    return toRemove.length;
  }

  /**
   * Kill system process by PID
   */
  async killSystemProcess(pid: number, signal = 'SIGTERM'): Promise<boolean> {
    try {
      process.kill(pid, signal);
      this.emit('systemProcessKilled', pid, signal);
      return true;
    } catch (error) {
      if (error.code === 'ESRCH') {
        return false; // Process not found
      }
      throw new Error(`Failed to kill process ${pid}: ${error.message}`);
    }
  }

  // ================================
  // Scheduling and Persistence
  // ================================

  private startScheduler(): void {
    this.schedulerInterval = setInterval(() => {
      this.checkScheduledJobs();
    }, 60000); // Check every minute
  }

  private async checkScheduledJobs(): Promise<void> {
    const now = new Date();

    for (const job of this.jobs.values()) {
      if (job.type === 'scheduled' && job.schedule && job.status === 'created') {
        let shouldRun = false;

        if (job.schedule.nextRun && now >= job.schedule.nextRun) {
          shouldRun = true;
        } else if (job.schedule.interval) {
          const lastRun = job.startedAt || job.createdAt;
          if (now.getTime() - lastRun.getTime() >= job.schedule.interval) {
            shouldRun = true;
          }
        }

        if (shouldRun) {
          try {
            await this.startJob(job.id);

            // Schedule next run
            if (job.schedule.interval) {
              job.schedule.nextRun = new Date(now.getTime() + job.schedule.interval);
            }
          } catch (error) {
            console.error(`Failed to start scheduled job ${job.id}:`, error);
          }
        }
      }
    }
  }

  private async loadPersistedJobs(): Promise<void> {
    try {
      if (fs.existsSync(this.persistenceFile)) {
        const data = await fs.promises.readFile(this.persistenceFile, 'utf8');
        
        // Skip if file is empty or only whitespace
        if (!data.trim()) {
          return;
        }
        
        const jobsData = JSON.parse(data);

        for (const jobData of jobsData) {
          // Restore dates
          jobData.createdAt = new Date(jobData.createdAt);
          if (jobData.startedAt) jobData.startedAt = new Date(jobData.startedAt);
          if (jobData.completedAt) jobData.completedAt = new Date(jobData.completedAt);
          if (jobData.schedule?.nextRun) {
            jobData.schedule.nextRun = new Date(jobData.schedule.nextRun);
          }

          this.jobs.set(jobData.id, jobData);
          if (jobData.id.startsWith('job_')) {
            const jobNum = parseInt(jobData.id.split('_')[1]);
            if (jobNum >= this.nextJobId) {
              this.nextJobId = jobNum + 1;
            }
          }
        }
      }
    } catch (error) {
      // Only log if it's not a JSON parsing error on empty file
      if (error instanceof SyntaxError && error.message.includes('Unexpected end of JSON input')) {
        // File is empty or corrupted, silently ignore
        return;
      }
      console.error('Failed to load persisted jobs:', error);
    }
  }

  private async persistJobs(): Promise<void> {
    try {
      const jobsData = Array.from(this.jobs.values()).map(job => {
        // Remove process reference and timer before serializing
        const { process: _process, timer: _timer, ...serializable } = job;
        return serializable;
      });

      await fs.promises.writeFile(
        this.persistenceFile,
        JSON.stringify(jobsData, null, 2)
      );
    } catch (error) {
      console.error('Failed to persist jobs:', error);
    }
  }

  private setupCleanupHandlers(): void {
    const cleanup = () => {
      if (this.schedulerInterval) {
        clearInterval(this.schedulerInterval);
      }
      // Kill all running jobs
      for (const job of this.jobs.values()) {
        if (job.status === 'running' && job.pid) {
          try {
            process.kill(job.pid, 'SIGTERM');
          } catch (_) {
            // Ignore errors when killing jobs during cleanup
          }
        }
      }
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('exit', cleanup);
  }

  /**
   * Shutdown the job manager
   */
  async shutdown(): Promise<void> {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }

    // Gracefully stop all running jobs
    const runningJobs = this.listJobs({ status: ['running', 'stopped'] });

    for (const job of runningJobs) {
      try {
        await this.killJob(job.id, 'SIGTERM');
      } catch (error) {
        console.warn(`Failed to stop job ${job.id}:`, error.message);
      }
    }

    await this.persistJobs();
    this.emit('shutdown');
  }
}

export default JobManager;