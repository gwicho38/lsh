/**
 * Daemon Command Registrar
 * Registers all daemon-related CLI commands using BaseCommandRegistrar
 */

import { Command } from 'commander';
import { BaseCommandRegistrar } from '../../lib/base-command-registrar.js';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Type helper to extract options from commander command
 */
interface CommandOptions {
  [key: string]: unknown;
}

export class DaemonCommandRegistrar extends BaseCommandRegistrar {
  constructor() {
    super('Daemon');
  }

  async register(program: Command): Promise<void> {
    const daemonCmd = this.createCommand(program, 'daemon', 'LSH daemon management commands');

    this.registerDaemonControlCommands(daemonCmd);
    this.registerJobManagementCommands(daemonCmd);
    this.registerDatabaseCommands(daemonCmd);
  }

  private registerDaemonControlCommands(daemonCmd: Command): void {
    // Status command
    this.addSubcommand(daemonCmd, {
      name: 'status',
      description: 'Get daemon status',
      action: async () => {
        const status = await this.withDaemonAction(async (client) => {
          return await client.getStatus();
        });

        this.logInfo('Daemon Status:');
        this.logInfo(`  PID: ${status.pid}`);
        this.logInfo(`  Uptime: ${Math.floor(status.uptime / 60)} minutes`);
        if (status.memoryUsage) {
          this.logInfo(`  Memory: ${Math.round(status.memoryUsage.heapUsed / 1024 / 1024)} MB`);
        }
        if (status.jobs) {
          this.logInfo(`  Jobs: ${status.jobs.total} total, ${status.jobs.running} running`);
        }
      }
    });

    // Start command
    this.addSubcommand(daemonCmd, {
      name: 'start',
      description: 'Start the daemon',
      action: async () => {
        const { spawn } = await import('child_process');
        const socketPath = `/tmp/lsh-job-daemon-${process.env.USER || 'user'}.sock`;
        const daemonProcess = spawn('node', ['dist/daemon/lshd.js', 'start', socketPath], {
          detached: true,
          stdio: 'ignore'
        });

        daemonProcess.unref();
        this.logSuccess('Daemon started');
        this.logInfo('Check status with: lsh daemon status');
      }
    });

    // Stop command
    this.addSubcommand(daemonCmd, {
      name: 'stop',
      description: 'Stop the daemon',
      action: async () => {
        if (!this.isDaemonRunning()) {
          this.logWarning('Daemon is not running');
          return;
        }

        await this.withDaemonAction(async (client) => {
          await client.stopDaemon();
        });

        this.logSuccess('Daemon stopped');
      }
    });

    // Restart command
    this.addSubcommand(daemonCmd, {
      name: 'restart',
      description: 'Restart the daemon',
      action: async () => {
        if (this.isDaemonRunning()) {
          await this.withDaemonAction(async (client) => {
            await client.restartDaemon();
          });
          this.logSuccess('Daemon restarted');
        } else {
          this.logWarning('Daemon is not running, starting...');
          const { spawn } = await import('child_process');
          const daemonProcess = spawn('node', ['dist/daemon/lshd.js', 'start'], {
            detached: true,
            stdio: 'ignore'
          });
          daemonProcess.unref();
          this.logSuccess('Daemon started');
        }
      }
    });

    // Cleanup command
    this.addSubcommand(daemonCmd, {
      name: 'cleanup',
      description: 'Clean up daemon processes and files',
      options: [
        { flags: '-f, --force', description: 'Force cleanup without prompts', defaultValue: false }
      ],
      action: async (options: unknown) => {
        const opts = options as CommandOptions;
        await this.cleanupDaemon(opts.force as boolean);
      }
    });
  }

  private registerJobManagementCommands(daemonCmd: Command): void {
    const jobCmd = daemonCmd
      .command('job')
      .description('Job management commands');

    // Create job
    this.addSubcommand(jobCmd, {
      name: 'create',
      description: 'Create a new cron job',
      options: [
        { flags: '-n, --name <name>', description: 'Job name' },
        { flags: '-c, --command <command>', description: 'Command to execute' },
        { flags: '-s, --schedule <schedule>', description: 'Cron schedule (e.g., "0 2 * * *")' },
        { flags: '-i, --interval <interval>', description: 'Interval in milliseconds' },
        { flags: '-d, --description <description>', description: 'Job description' },
        { flags: '-w, --working-dir <dir>', description: 'Working directory' },
        { flags: '-e, --env <env>', description: 'Environment variables (JSON)' },
        { flags: '-t, --tags <tags>', description: 'Comma-separated tags' },
        { flags: '-p, --priority <priority>', description: 'Priority (0-10)', defaultValue: '5' },
        { flags: '--max-retries <retries>', description: 'Maximum retries', defaultValue: '3' },
        { flags: '--timeout <timeout>', description: 'Timeout in milliseconds', defaultValue: '0' },
        { flags: '--no-database-sync', description: 'Disable database synchronization' }
      ],
      action: async (options: unknown) => {
        const opts = options as CommandOptions;
        if (!opts.name || !opts.command || (!opts.schedule && !opts.interval)) {
          throw new Error('Missing required options: --name, --command, and (--schedule or --interval)');
        }

        const jobSpec = this.createJobSpec(opts as unknown as import('../../lib/base-command-registrar.js').JobSpecOptions);

        await this.withDaemonAction(async (client) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await client.createDatabaseCronJob(jobSpec as any);
        });

        this.logSuccess('Job created successfully:');
        this.logInfo(`  ID: ${jobSpec.id}`);
        this.logInfo(`  Name: ${jobSpec.name}`);
        this.logInfo(`  Command: ${jobSpec.command}`);
        this.logInfo(`  Schedule: ${this.formatSchedule(jobSpec.schedule)}`);
        this.logInfo(`  Database Sync: ${jobSpec.databaseSync ? 'Enabled' : 'Disabled'}`);
      }
    });

    // List jobs
    this.addSubcommand(jobCmd, {
      name: 'list',
      description: 'List all jobs',
      options: [
        { flags: '-f, --filter <filter>', description: 'Filter jobs by status' }
      ],
      action: async (options: unknown) => {
        const opts = options as CommandOptions;
        const jobs = await this.withDaemonAction(async (client) => {
          return await client.listJobs(opts.filter ? { status: opts.filter as string[] } : undefined);
        });

        this.displayJobs(jobs);
      }
    });

    // Start job
    this.addSubcommand(jobCmd, {
      name: 'start',
      description: 'Start a job',
      arguments: [{ name: 'jobId', required: true }],
      action: async (jobId: unknown) => {
        await this.withDaemonAction(async (client) => {
          await client.startJob(jobId as string);
        });

        this.logSuccess(`Job ${jobId} started`);
      }
    });

    // Trigger job
    this.addSubcommand(jobCmd, {
      name: 'trigger',
      description: 'Trigger a job to run immediately (bypass schedule)',
      arguments: [{ name: 'jobId', required: true }],
      action: async (jobId: unknown) => {
        const result = await this.withDaemonAction(
          async (client) => await client.triggerJob(jobId as string),
          { forUser: true }
        );

        this.logSuccess(`Job ${jobId} triggered successfully`);
        if (result.output) {
          this.logInfo('Output:');
          this.logInfo(result.output);
        }
      }
    });

    // Trigger all jobs
    this.addSubcommand(jobCmd, {
      name: 'trigger-all',
      description: 'Trigger all active jobs to run immediately',
      options: [
        { flags: '-f, --filter <status>', description: 'Filter by job status', defaultValue: 'created' }
      ],
      action: async (options: unknown) => {
        const opts = options as CommandOptions;
        await this.withDaemonAction(async (client) => {
          const jobs = await client.listJobs({ status: opts.filter as string[] });

          this.logInfo(`Triggering ${jobs.length} jobs...`);

          for (const job of jobs) {
            try {
              this.logInfo(`  Triggering ${job.name} (${job.id})...`);
              const result = await client.triggerJob(job.id);
              this.logSuccess(`  ${job.name} completed`);
              if (result.output) {
                const preview = result.output.substring(0, 100);
                this.logInfo(`  Output: ${preview}${result.output.length > 100 ? '...' : ''}`);
              }
            } catch (error) {
              const err = error as Error;
              this.logError(`  ${job.name} failed: ${err.message || err}`);
            }
          }
        }, { forUser: true });

        this.logSuccess('All jobs triggered');
      }
    });

    // Stop job
    this.addSubcommand(jobCmd, {
      name: 'stop',
      description: 'Stop a job',
      arguments: [{ name: 'jobId', required: true }],
      options: [
        { flags: '-s, --signal <signal>', description: 'Signal to send', defaultValue: 'SIGTERM' }
      ],
      action: async (jobId: unknown, options: unknown) => {
        const opts = options as CommandOptions;
        await this.withDaemonAction(async (client) => {
          await client.stopJob(jobId as string, opts.signal as string);
        });

        this.logSuccess(`Job ${jobId} stopped with signal ${opts.signal}`);
      }
    });

    // Remove job
    this.addSubcommand(jobCmd, {
      name: 'remove',
      description: 'Remove a job',
      arguments: [{ name: 'jobId', required: true }],
      options: [
        { flags: '-f, --force', description: 'Force removal', defaultValue: false }
      ],
      action: async (jobId: unknown, options: unknown) => {
        const opts = options as CommandOptions;
        await this.withDaemonAction(async (client) => {
          await client.removeJob(jobId as string, opts.force as boolean);
        });

        this.logSuccess(`Job ${jobId} removed`);
      }
    });

    // Job info
    this.addSubcommand(jobCmd, {
      name: 'info',
      description: 'Get job information',
      arguments: [{ name: 'jobId', required: true }],
      action: async (jobId: unknown) => {
        const job = await this.withDaemonAction(async (client) => {
          return await client.getJob(jobId as string);
        });

        if (!job) {
          throw new Error(`Job ${jobId} not found`);
        }

        this.logInfo(`Job Information: ${jobId}`);
        this.logInfo(`  Name: ${job.name}`);
        this.logInfo(`  Command: ${job.command}`);
        this.logInfo(`  Status: ${job.status}`);
        this.logInfo(`  Priority: ${job.priority}`);
        this.logInfo(`  Working Directory: ${job.cwd}`);
        this.logInfo(`  User: ${job.user}`);
        this.logInfo(`  Tags: ${job.tags?.join(', ') || 'None'}`);

        if (job.schedule) {
          this.logInfo(`  Schedule: ${this.formatSchedule(job.schedule)}`);
        }
      }
    });
  }

  private registerDatabaseCommands(daemonCmd: Command): void {
    const dbCmd = daemonCmd
      .command('db')
      .description('Database integration commands');

    // Job history
    this.addSubcommand(dbCmd, {
      name: 'history',
      description: 'Get job execution history from database',
      options: [
        { flags: '-j, --job-id <jobId>', description: 'Filter by job ID' },
        { flags: '-l, --limit <limit>', description: 'Limit number of results', defaultValue: '50' }
      ],
      action: async (options: unknown) => {
        const opts = options as CommandOptions;
        const jobs = await this.withDaemonAction(
          async (client) => await client.getJobHistory(opts.jobId as string | undefined, parseInt(opts.limit as string)),
          { forUser: true, requireRunning: false }
        );

        this.logInfo(`Job History (${jobs.length} records):`);
        jobs.forEach(job => {
          const started = new Date(job.started_at).toLocaleString();
          const completed = job.completed_at ? new Date(job.completed_at).toLocaleString() : 'Running';
          this.logInfo(`  ${job.job_id}: ${job.command}`);
          this.logInfo(`    Started: ${started}`);
          this.logInfo(`    Completed: ${completed}`);
          this.logInfo(`    Status: ${job.status}`);
          this.logInfo(`    Exit Code: ${job.exit_code || 'N/A'}`);
          this.logInfo('');
        });
      }
    });

    // Job statistics
    this.addSubcommand(dbCmd, {
      name: 'stats',
      description: 'Get job statistics from database',
      options: [
        { flags: '-j, --job-id <jobId>', description: 'Filter by job ID' }
      ],
      action: async (options: unknown) => {
        const opts = options as CommandOptions;
        const stats = await this.withDaemonAction(
          async (client) => await client.getJobStatistics(opts.jobId as string | undefined),
          { forUser: true, requireRunning: false }
        );

        this.logInfo('Job Statistics:');
        this.logInfo(`  Total Jobs: ${stats.totalJobs}`);
        this.logInfo(`  Success Rate: ${stats.successRate.toFixed(1)}%`);
        this.logInfo(`  Last Execution: ${stats.lastExecution || 'Never'}`);

        this.logInfo('\n  Status Breakdown:');
        Object.entries(stats.byStatus).forEach(([status, count]) => {
          this.logInfo(`    ${status}: ${count}`);
        });
      }
    });

    // Recent executions
    this.addSubcommand(dbCmd, {
      name: 'recent',
      description: 'Show most recent job executions with output',
      options: [
        { flags: '-l, --limit <limit>', description: 'Number of recent executions to show', defaultValue: '5' }
      ],
      action: async (options: unknown) => {
        const opts = options as CommandOptions;
        const jobs = await this.withDaemonAction(
          async (client) => await client.getJobHistory(undefined, parseInt(opts.limit as string)),
          { forUser: true }
        );

        this.logInfo(`Recent Job Executions (${jobs.length} records):`);

        jobs.forEach((job, index) => {
          const started = new Date(job.started_at).toLocaleString();
          const status = job.status === 'completed' ? '✅' :
                        job.status === 'failed' ? '❌' :
                        job.status === 'running' ? '⏳' : '⏸️';

          this.logInfo(`\n${index + 1}. ${status} ${job.job_id}`);
          this.logInfo(`   Executed: ${started}`);
          this.logInfo(`   Status: ${job.status}`);
          if (job.output) {
            const preview = job.output.substring(0, 200);
            this.logInfo(`   Output: ${preview}${job.output.length > 200 ? '...' : ''}`);
          }
          if (job.error) {
            this.logInfo(`   Error: ${job.error}`);
          }
        });

        if (jobs.length === 0) {
          this.logInfo('\nNo recent executions found.');
          this.logInfo('   Trigger jobs to see execution history:');
          this.logInfo('   lsh daemon job trigger <jobId>');
          this.logInfo('   lsh daemon job trigger-all');
        }
      }
    });

    // Job status with executions
    this.addSubcommand(dbCmd, {
      name: 'status',
      description: 'Show detailed status and recent executions of a specific job',
      arguments: [{ name: 'jobId', required: true }],
      action: async (jobId) => {
        await this.withDaemonAction(async (client) => {
          const jobs = await client.listJobs();
          const job = jobs.find(j => j.id === jobId);

          if (!job) {
            throw new Error(`Job ${jobId} not found in daemon registry`);
          }

          this.logInfo(`Job Status: ${job.name} (${jobId})`);
          const cmdPreview = (job.command as string).substring(0, 100);
          this.logInfo(`   Command: ${cmdPreview}${(job.command as string).length > 100 ? '...' : ''}`);
          this.logInfo(`   Status: ${job.status}`);
          this.logInfo(`   Schedule: ${this.formatSchedule(job.schedule as import('../../lib/base-command-registrar.js').ScheduleConfig | undefined)}`);
          this.logInfo(`   Priority: ${job.priority}`);

          const executions = await client.getJobHistory(jobId as string, 5);

          if (executions.length > 0) {
            this.logInfo(`\nRecent Executions (${executions.length} records):`);
            executions.forEach((exec, index) => {
              const started = new Date(exec.started_at).toLocaleString();
              const status = exec.status === 'completed' ? '✅' :
                            exec.status === 'failed' ? '❌' :
                            exec.status === 'running' ? '⏳' : '⏸️';

              this.logInfo(`\n${index + 1}. ${status} ${started}`);
              this.logInfo(`   Status: ${exec.status} (Exit Code: ${exec.exit_code || 'N/A'})`);
              if (exec.output) {
                const preview = exec.output.substring(0, 150);
                this.logInfo(`   Output: ${preview}${exec.output.length > 150 ? '...' : ''}`);
              }
            });
          } else {
            this.logInfo('\nNo execution history found for this job.');
            this.logInfo(`   Run: lsh daemon job trigger ${jobId}`);
          }
        }, { forUser: true });
      }
    });

    // Sync jobs to database
    this.addSubcommand(dbCmd, {
      name: 'sync',
      description: 'Sync current in-memory jobs to database',
      action: async () => {
        const synced = await this.withDaemonAction(async (client) => {
          const jobs = await client.listJobs();
          this.logInfo(`Syncing ${jobs.length} jobs to database...`);

          let syncCount = 0;
          for (const job of jobs) {
            try {
              const dbStatus = job.status === 'created' ? 'stopped' :
                             job.status === 'running' ? 'running' :
                             job.status === 'completed' ? 'completed' : 'failed';

              await client.syncJobToDatabase({
                id: job.id,
                name: job.name,
                command: job.command,
                schedule: job.schedule,
                enabled: true,
                databaseSync: true
              } as any, dbStatus);
              this.logSuccess(`  Synced ${job.name} (${job.id}) - status: ${dbStatus}`);
              syncCount++;
            } catch (error) {
              const err = error as Error;
              this.logError(`  Failed to sync ${job.name}: ${err.message}`);
            }
          }

          return { syncCount, totalJobs: jobs.length };
        }, { forUser: true });

        this.logSuccess(`\nSuccessfully synced ${synced.syncCount}/${synced.totalJobs} jobs to database`);
        this.logInfo('\nCheck results with:');
        this.logInfo('  lsh daemon db stats');
        this.logInfo('  lsh daemon db history');
      }
    });
  }

  private async cleanupDaemon(force: boolean = false): Promise<void> {
    this.logInfo('LSH Daemon Cleanup');
    this.logInfo('====================');
    this.logInfo('');

    try {
      // 1. Find daemon processes
      this.logInfo('Finding LSH daemon processes...');

      let daemonPids: string[] = [];
      try {
        const { stdout } = await execAsync('pgrep -f "lshd.js"');
        daemonPids = stdout.trim().split('\n').filter(pid => pid.length > 0);
      } catch (_error) {
        // No processes found
      }

      if (daemonPids.length > 0) {
        this.logInfo('Found daemon processes:');
        try {
          const { stdout } = await execAsync('ps aux | grep lshd | grep -v grep');
          stdout.split('\n').filter(line => line.trim()).forEach(line => this.logInfo(`  ${line}`));
        } catch (_error) {
          this.logInfo(`  PIDs: ${daemonPids.join(', ')}`);
        }
        this.logInfo('');

        if (force) {
          this.logInfo('Force mode: Killing daemon processes...');
          try {
            await execAsync('pkill -f "lshd.js"');
            this.logSuccess('Daemon processes killed');
          } catch (_error) {
            this.logWarning('Some processes may require manual cleanup');
          }
        } else {
          this.logWarning('Found running daemon processes. Use --force to kill them automatically');
          this.logInfo('   Or manually run: pkill -f "lshd.js"');
        }
      } else {
        this.logInfo('No daemon processes found');
      }

      // 2. Clean up socket files
      this.logInfo('Cleaning up socket files...');
      try {
        const { stdout } = await execAsync(`find /tmp -name "lsh-*daemon*.sock" 2>/dev/null || echo ""`);
        const socketFiles = stdout.trim().split('\n').filter(file => file.length > 0);

        if (socketFiles.length > 0) {
          this.logInfo('Found socket files:');
          socketFiles.forEach(file => this.logInfo(`  ${file}`));

          for (const socket of socketFiles) {
            try {
              if (fs.existsSync(socket)) {
                fs.unlinkSync(socket);
                this.logSuccess(`Removed: ${socket}`);
              }
            } catch (error) {
              const err = error as Error;
              this.logWarning(`Could not remove: ${socket} (${err.message})`);
            }
          }
        } else {
          this.logInfo('No socket files found');
        }
      } catch (_error) {
        this.logInfo('No socket files found');
      }

      // 3. Clean up PID files
      this.logInfo('Cleaning up PID files...');
      try {
        const { stdout } = await execAsync(`find /tmp -name "lsh-*daemon*.pid" 2>/dev/null || echo ""`);
        const pidFiles = stdout.trim().split('\n').filter(file => file.length > 0);

        if (pidFiles.length > 0) {
          this.logInfo('Found PID files:');
          pidFiles.forEach(file => this.logInfo(`  ${file}`));

          for (const pidFile of pidFiles) {
            try {
              if (fs.existsSync(pidFile)) {
                fs.unlinkSync(pidFile);
                this.logSuccess(`Removed: ${pidFile}`);
              }
            } catch (error) {
              const err = error as Error;
              this.logWarning(`Could not remove: ${pidFile} (${err.message})`);
            }
          }
        } else {
          this.logInfo('No PID files found');
        }
      } catch (_error) {
        this.logInfo('No PID files found');
      }

      // 4. Verify cleanup
      this.logInfo('');
      this.logInfo('Verifying cleanup...');

      let remainingProcesses: string[] = [];
      try {
        const { stdout } = await execAsync('pgrep -f "lshd.js"');
        remainingProcesses = stdout.trim().split('\n').filter(pid => pid.length > 0);
      } catch (_error) {
        // No processes found (good)
      }

      let remainingSockets: string[] = [];
      try {
        const { stdout } = await execAsync(`find /tmp -name "lsh-*daemon*.sock" 2>/dev/null || echo ""`);
        remainingSockets = stdout.trim().split('\n').filter(file => file.length > 0);
      } catch (_error) {
        // No sockets found (good)
      }

      if (remainingProcesses.length === 0 && remainingSockets.length === 0) {
        this.logSuccess('Cleanup completed successfully!');
        this.logInfo('');
        this.logInfo('Next steps:');
        this.logInfo('  1. Start fresh daemon:  lsh daemon start');
        this.logInfo('  2. Check status:        lsh daemon status');
        this.logInfo('  3. View dashboard:      ./scripts/monitor-dashboard.sh');
      } else {
        this.logWarning('Some items may still remain:');
        if (remainingProcesses.length > 0) {
          this.logInfo(`  Processes: ${remainingProcesses.join(', ')}`);
        }
        if (remainingSockets.length > 0) {
          this.logInfo(`  Sockets: ${remainingSockets.join(', ')}`);
        }
        this.logInfo('');
        this.logInfo('Try running with --force for complete cleanup:');
        this.logInfo('   lsh daemon cleanup --force');
      }

    } catch (error) {
      const err = error as Error;
      throw new Error(`Cleanup failed: ${err.message}`);
    }
  }
}
