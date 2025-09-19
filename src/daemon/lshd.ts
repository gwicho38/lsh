#!/usr/bin/env node
/**
 * LSH Job Daemon - Persistent job execution service
 * Runs independently of LSH shell processes to ensure reliable job execution
 */

import { spawn, exec, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as net from 'net';
import { EventEmitter } from 'events';
import JobManager, { JobSpec } from '../lib/job-manager.js';

const execAsync = promisify(exec);

export interface DaemonConfig {
  pidFile: string;
  logFile: string;
  jobsFile: string;
  socketPath: string;
  checkInterval: number;
  maxLogSize: number;
  autoRestart: boolean;
}

export class LSHJobDaemon extends EventEmitter {
  private config: DaemonConfig;
  private jobManager: JobManager;
  private isRunning = false;
  private checkTimer?: NodeJS.Timeout;
  private logStream?: fs.WriteStream;
  private ipcServer?: any; // Unix socket server for communication

  constructor(config?: Partial<DaemonConfig>) {
    super();

    const userSuffix = process.env.USER ? `-${process.env.USER}` : '';
    
    this.config = {
      pidFile: `/tmp/lsh-job-daemon${userSuffix}.pid`,
      logFile: `/tmp/lsh-job-daemon${userSuffix}.log`,
      jobsFile: `/tmp/lsh-daemon-jobs${userSuffix}.json`,
      socketPath: `/tmp/lsh-job-daemon${userSuffix}.sock`,
      checkInterval: 10000, // 10 seconds
      maxLogSize: 10 * 1024 * 1024, // 10MB
      autoRestart: true,
      ...config
    };

    this.jobManager = new JobManager(this.config.jobsFile);
    this.setupLogging();
    this.setupIPC();
  }

  /**
   * Start the daemon
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Daemon is already running');
    }

    // Check if daemon is already running
    if (await this.isDaemonRunning()) {
      throw new Error('Another daemon instance is already running');
    }

    this.log('INFO', 'Starting LSH Job Daemon');

    // Write PID file
    await fs.promises.writeFile(this.config.pidFile, process.pid.toString());

    this.isRunning = true;
    this.startJobScheduler();
    this.startIPCServer();

    // Setup cleanup handlers
    this.setupSignalHandlers();

    this.log('INFO', `Daemon started with PID ${process.pid}`);
    this.emit('started');
  }

  /**
   * Stop the daemon gracefully
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.log('INFO', 'Stopping LSH Job Daemon');

    this.isRunning = false;

    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    // Stop all running jobs gracefully
    await this.stopAllJobs();

    // Cleanup IPC
    if (this.ipcServer) {
      this.ipcServer.close();
    }

    // Remove PID file
    try {
      await fs.promises.unlink(this.config.pidFile);
    } catch (error) {
      // Ignore if file doesn't exist
    }

    // Close log stream
    if (this.logStream) {
      this.logStream.end();
    }

    this.log('INFO', 'Daemon stopped');
    this.emit('stopped');
  }

  /**
   * Restart the daemon
   */
  async restart(): Promise<void> {
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    await this.start();
  }

  /**
   * Get daemon status
   */
  async getStatus(): Promise<any> {
    const stats = this.jobManager.getJobStats();
    const uptime = process.uptime();

    return {
      isRunning: this.isRunning,
      pid: process.pid,
      uptime,
      jobs: stats,
      config: this.config,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };
  }

  /**
   * Add a job to the daemon
   */
  async addJob(jobSpec: Partial<JobSpec>): Promise<JobSpec> {
    this.log('INFO', `Adding job: ${jobSpec.name || 'unnamed'}`);
    return await this.jobManager.createJob(jobSpec);
  }

  /**
   * Start a job
   */
  async startJob(jobId: string): Promise<JobSpec> {
    this.log('INFO', `Starting job: ${jobId}`);
    return await this.jobManager.startJob(jobId);
  }

  /**
   * Stop a job
   */
  async stopJob(jobId: string, signal = 'SIGTERM'): Promise<JobSpec> {
    this.log('INFO', `Stopping job: ${jobId} with signal ${signal}`);
    return await this.jobManager.killJob(jobId, signal);
  }

  /**
   * Get job information
   */
  getJob(jobId: string): JobSpec | undefined {
    return this.jobManager.getJob(jobId);
  }

  /**
   * List all jobs
   */
  listJobs(filter?: any, limit?: number): JobSpec[] {
    try {
      const jobs = this.jobManager.listJobs(filter);

      // Apply limit if specified
      if (limit && limit > 0) {
        return jobs.slice(0, limit);
      }

      // Default limit to prevent oversized responses
      const defaultLimit = 100;
      return jobs.slice(0, defaultLimit);
    } catch (error) {
      this.log('ERROR', `Failed to list jobs: ${error.message}`);
      return [];
    }
  }

  /**
   * Remove a job
   */
  async removeJob(jobId: string, force = false): Promise<boolean> {
    this.log('INFO', `Removing job: ${jobId}, force: ${force}`);
    return await this.jobManager.removeJob(jobId, force);
  }

  private async isDaemonRunning(): Promise<boolean> {
    try {
      // First, kill any existing daemon processes for this socket path
      await this.killExistingDaemons();

      const pidData = await fs.promises.readFile(this.config.pidFile, 'utf8');
      const pid = parseInt(pidData.trim());

      // Check if process is running
      try {
        process.kill(pid, 0); // Signal 0 just checks if process exists
        return true;
      } catch (error) {
        // Process doesn't exist, remove stale PID file
        await fs.promises.unlink(this.config.pidFile);
        return false;
      }
    } catch (error) {
      return false; // PID file doesn't exist
    }
  }

  private async killExistingDaemons(): Promise<void> {
    try {
      // Find all lshd processes with the same socket path
      const { stdout } = await execAsync(`ps aux | grep "lshd.js" | grep "${this.config.socketPath}" | grep -v grep || true`);

      if (stdout.trim()) {
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[1]);
          if (pid && pid !== process.pid) {
            try {
              this.log('INFO', `Killing existing daemon process ${pid}`);
              process.kill(pid, 9); // Force kill
            } catch (error) {
              // Process might already be dead
            }
          }
        }
      }
    } catch (error) {
      // ps command failed, ignore
    }
  }

  private startJobScheduler(): void {
    this.checkTimer = setInterval(() => {
      this.checkScheduledJobs();
      this.cleanupCompletedJobs();
      this.rotateLogs();
    }, this.config.checkInterval);
  }

  private async checkScheduledJobs(): Promise<void> {
    const jobs = this.jobManager.listJobs({ status: ['created'] });
    const now = new Date();

    for (const job of jobs) {
      if (job.schedule) {
        let shouldRun = false;

        // Check cron schedule
        if (job.schedule.cron) {
          shouldRun = this.shouldRunByCron(job.schedule.cron, now);
        }

        // Check interval schedule
        if (job.schedule.interval && job.schedule.nextRun) {
          shouldRun = now >= job.schedule.nextRun;
        }

        if (shouldRun) {
          try {
            await this.jobManager.startJob(job.id);
            this.log('INFO', `Started scheduled job: ${job.id} (${job.name})`);

            // Schedule next run for interval jobs
            if (job.schedule.interval) {
              job.schedule.nextRun = new Date(now.getTime() + job.schedule.interval);
            }
          } catch (error) {
            this.log('ERROR', `Failed to start scheduled job ${job.id}: ${error.message}`);
          }
        }
      }
    }
  }

  private shouldRunByCron(cronExpr: string, now: Date): boolean {
    // Simple cron parser - would need full implementation for production
    // For now, implement basic patterns like "*/5 * * * *" (every 5 minutes)
    try {
      const [minute, hour, day, month, weekday] = cronExpr.split(' ');

      if (minute.startsWith('*/')) {
        const interval = parseInt(minute.substring(2));
        return now.getMinutes() % interval === 0 && now.getSeconds() < 30;
      }

      // More cron patterns would be implemented here
      return false;
    } catch (error) {
      this.log('ERROR', `Invalid cron expression: ${cronExpr}`);
      return false;
    }
  }

  private async cleanupCompletedJobs(): Promise<void> {
    const cleaned = await this.jobManager.cleanupJobs(24); // Clean jobs older than 24 hours
    if (cleaned > 0) {
      this.log('INFO', `Cleaned up ${cleaned} old jobs`);
    }
  }

  private async stopAllJobs(): Promise<void> {
    const runningJobs = this.jobManager.listJobs({ status: ['running', 'stopped'] });

    for (const job of runningJobs) {
      try {
        await this.jobManager.killJob(job.id, 'SIGTERM');
        this.log('INFO', `Stopped job: ${job.id}`);
      } catch (error) {
        this.log('ERROR', `Failed to stop job ${job.id}: ${error.message}`);
      }
    }
  }

  private setupLogging(): void {
    // Create log directory if it doesn't exist
    const logDir = path.dirname(this.config.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.logStream = fs.createWriteStream(this.config.logFile, { flags: 'a' });

    // Log uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.log('FATAL', `Uncaught exception: ${error.message}`);
      this.log('FATAL', error.stack || '');
      if (this.config.autoRestart) {
        this.restart();
      } else {
        process.exit(1);
      }
    });

    process.on('unhandledRejection', (reason) => {
      this.log('ERROR', `Unhandled promise rejection: ${reason}`);
    });
  }

  private setupIPC(): void {
    // Setup Unix domain socket for communication with LSH clients

    // Remove existing socket file
    try {
      fs.unlinkSync(this.config.socketPath);
    } catch (error) {
      // Ignore if doesn't exist
    }

    this.ipcServer = net.createServer((socket: any) => {
      socket.on('data', async (data: Buffer) => {
        let messageId: string | undefined;
        try {
          const message = JSON.parse(data.toString());
          messageId = message.id;
          const response = await this.handleIPCMessage(message);
          socket.write(JSON.stringify({
            success: true,
            data: response,
            id: messageId
          }));
        } catch (error) {
          socket.write(JSON.stringify({
            success: false,
            error: error.message,
            id: messageId
          }));
        }
      });
    });
  }

  private startIPCServer(): void {
    if (this.ipcServer) {
      // Clean up any existing socket file
      try {
        if (fs.existsSync(this.config.socketPath)) {
          fs.unlinkSync(this.config.socketPath);
        }
      } catch (error) {
        // Ignore cleanup errors
      }

      this.ipcServer.listen(this.config.socketPath, () => {
        this.log('INFO', `IPC server listening on ${this.config.socketPath}`);
      });

      this.ipcServer.on('error', (error) => {
        this.log('ERROR', `IPC server error: ${error.message}`);
        if (error.message.includes('EADDRINUSE')) {
          this.log('INFO', 'Socket already in use, attempting cleanup...');
          try {
            fs.unlinkSync(this.config.socketPath);
            // Retry after cleanup
            setTimeout(() => {
              this.ipcServer.listen(this.config.socketPath);
            }, 1000);
          } catch (cleanupError) {
            this.log('ERROR', `Failed to cleanup socket: ${cleanupError.message}`);
          }
        }
      });
    }
  }

  private async handleIPCMessage(message: any): Promise<any> {
    const { command, args } = message;

    switch (command) {
      case 'status':
        return await this.getStatus();
      case 'addJob':
        return await this.addJob(args.jobSpec);
      case 'startJob':
        return await this.startJob(args.jobId);
      case 'stopJob':
        return await this.stopJob(args.jobId, args.signal);
      case 'listJobs':
        return this.listJobs(args.filter, args.limit);
      case 'getJob':
        return this.getJob(args.jobId);
      case 'removeJob':
        return await this.removeJob(args.jobId, args.force);
      case 'restart':
        await this.restart();
        return { message: 'Daemon restarted' };
      case 'stop':
        await this.stop();
        return { message: 'Daemon stopped' };
      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  private log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}\n`;

    // Write to log file
    if (this.logStream) {
      this.logStream.write(logEntry);
    }

    // Also output to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(logEntry.trim());
    }

    this.emit('log', level, message);
  }

  private rotateLogs(): void {
    try {
      const stats = fs.statSync(this.config.logFile);
      if (stats.size > this.config.maxLogSize) {
        const backupFile = `${this.config.logFile}.${Date.now()}`;
        fs.renameSync(this.config.logFile, backupFile);

        // Close current stream and create new one
        if (this.logStream) {
          this.logStream.end();
          this.logStream = fs.createWriteStream(this.config.logFile, { flags: 'a' });
        }

        this.log('INFO', `Rotated log file to ${backupFile}`);
      }
    } catch (error) {
      // Ignore rotation errors
    }
  }

  private setupSignalHandlers(): void {
    process.on('SIGTERM', async () => {
      this.log('INFO', 'Received SIGTERM, shutting down gracefully');
      await this.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      this.log('INFO', 'Received SIGINT, shutting down gracefully');
      await this.stop();
      process.exit(0);
    });

    process.on('SIGHUP', async () => {
      this.log('INFO', 'Received SIGHUP, restarting');
      await this.restart();
    });
  }
}

// CLI interface for the daemon
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const subCommand = process.argv[3];
  const args = process.argv.slice(4);

  // Handle job commands
  if (command === 'job-add') {
    (async () => {
      try {
        const jobCommand = subCommand;
        if (!jobCommand) {
          console.error('❌ Usage: lshd job-add "command-to-run"');
          process.exit(1);
        }

        const client = new (await import('../lib/daemon-client.js')).default();

        if (!client.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await client.connect();

        const jobSpec = {
          id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: `Manual Job - ${jobCommand}`,
          command: jobCommand,
          type: 'manual',
          schedule: { interval: 0 }, // Run once
          env: process.env,
          cwd: process.cwd(),
          user: process.env.USER,
          priority: 5,
          tags: ['manual'],
          enabled: true,
          maxRetries: 0,
          timeout: 0,
        };

        const result = await client.addJob(jobSpec);
        console.log('✅ Job added successfully:');
        console.log(`  ID: ${result.id}`);
        console.log(`  Command: ${result.command}`);
        console.log(`  Status: ${result.status}`);

        // Start the job immediately
        await client.startJob(result.id);
        console.log(`✅ Job ${result.id} started`);

        client.disconnect();
        process.exit(0);
      } catch (error) {
        console.error('❌ Failed to add job:', error.message);
        process.exit(1);
      }
    })();
  } else {
    const socketPath = subCommand;
    const daemon = new LSHJobDaemon(socketPath ? { socketPath } : undefined);

    switch (command) {
      case 'start':
        daemon.start().catch(console.error);
        // Keep the process alive
        process.stdin.resume();
        break;
      case 'stop':
        daemon.stop().catch(console.error);
        break;
      case 'restart':
        daemon.restart().catch(console.error);
        // Keep the process alive
        process.stdin.resume();
        break;
      case 'status':
        daemon.getStatus().then(status => {
          console.log(JSON.stringify(status, null, 2));
          process.exit(0);
        }).catch(console.error);
        break;
      default:
        console.log('Usage: lshd {start|stop|restart|status|job-add}');
        console.log('  lshd job-add "command" - Add and start a job');
        process.exit(1);
    }
  }
}

export default LSHJobDaemon;