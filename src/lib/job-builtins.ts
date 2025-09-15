/**
 * Built-in commands for comprehensive job management
 */

import JobManager, { JobSpec, JobFilter, JobUpdate } from './job-manager.js';

export class JobBuiltins {
  constructor(private jobManager: JobManager) {}

  /**
   * job-create - Create a new job
   * Usage: job-create [OPTIONS] COMMAND
   */
  async jobCreate(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const options = this.parseCreateOptions(args);
      const command = args.slice(args.findIndex(arg => !arg.startsWith('-'))).join(' ');

      if (!command) {
        return {
          stdout: '',
          stderr: 'Usage: job-create [OPTIONS] COMMAND\n' +
                 'Options:\n' +
                 '  -n, --name NAME       Job name\n' +
                 '  -t, --type TYPE       Job type (shell|system|scheduled)\n' +
                 '  -p, --priority N      Priority (-20 to 19)\n' +
                 '  -d, --description D   Description\n' +
                 '  --timeout N           Timeout in seconds\n' +
                 '  --cwd PATH            Working directory\n' +
                 '  --log PATH            Log file path\n' +
                 '  --tag TAG             Add tag (can be used multiple times)\n' +
                 '  --schedule CRON       Schedule with cron expression\n' +
                 '  --interval N          Run every N seconds\n' +
                 '  --start               Start immediately after creation',
          exitCode: 1
        };
      }

      const jobSpec = {
        ...options,
        command
      };

      const job = await this.jobManager.createJob(jobSpec);

      let output = `Job created: ${job.id}\n`;
      output += `  Name: ${job.name}\n`;
      output += `  Command: ${job.command}\n`;
      output += `  Type: ${job.type}\n`;
      output += `  Status: ${job.status}\n`;

      if (options.start) {
        await this.jobManager.startJob(job.id);
        output += `  Started with PID: ${job.pid}\n`;
      }

      return { stdout: output, stderr: '', exitCode: 0 };
    } catch (error) {
      return { stdout: '', stderr: `Error: ${error.message}\n`, exitCode: 1 };
    }
  }

  /**
   * job-list - List jobs with filtering
   * Usage: job-list [OPTIONS]
   */
  async jobList(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const filter = this.parseListOptions(args);
      const jobs = this.jobManager.listJobs(filter);

      if (jobs.length === 0) {
        return { stdout: 'No jobs found.\n', stderr: '', exitCode: 0 };
      }

      let output = '';
      const detailed = args.includes('-l') || args.includes('--long');
      const showAll = args.includes('-a') || args.includes('--all');

      if (detailed) {
        for (const job of jobs) {
          output += this.formatJobDetailed(job) + '\n';
        }
      } else {
        output += 'ID            NAME                 STATUS      PID      STARTED              COMMAND\n';
        output += '============================================================================\n';
        for (const job of jobs) {
          if (!showAll && job.status === 'completed' &&
              job.completedAt &&
              Date.now() - job.completedAt.getTime() > 24 * 60 * 60 * 1000) {
            continue; // Skip old completed jobs unless --all
          }
          output += this.formatJobSummary(job) + '\n';
        }
      }

      return { stdout: output, stderr: '', exitCode: 0 };
    } catch (error) {
      return { stdout: '', stderr: `Error: ${error.message}\n`, exitCode: 1 };
    }
  }

  /**
   * job-show - Show detailed information about a job
   * Usage: job-show JOB_ID
   */
  async jobShow(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: 'Usage: job-show JOB_ID\n',
        exitCode: 1
      };
    }

    const jobId = args[0];
    const job = this.jobManager.getJob(jobId);

    if (!job) {
      return { stdout: '', stderr: `Job ${jobId} not found.\n`, exitCode: 1 };
    }

    const output = this.formatJobDetailed(job);
    return { stdout: output, stderr: '', exitCode: 0 };
  }

  /**
   * job-start - Start a created job
   * Usage: job-start JOB_ID
   */
  async jobStart(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (args.length === 0) {
      return { stdout: '', stderr: 'Usage: job-start JOB_ID\n', exitCode: 1 };
    }

    try {
      const jobId = args[0];
      const job = await this.jobManager.startJob(jobId);

      return {
        stdout: `Job ${jobId} started with PID ${job.pid}\n`,
        stderr: '',
        exitCode: 0
      };
    } catch (error) {
      return { stdout: '', stderr: `Error: ${error.message}\n`, exitCode: 1 };
    }
  }

  /**
   * job-stop - Stop/kill a running job
   * Usage: job-stop [OPTIONS] JOB_ID
   */
  async jobStop(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: 'Usage: job-stop [OPTIONS] JOB_ID\n' +
               'Options:\n' +
               '  -9, --kill    Send SIGKILL instead of SIGTERM\n' +
               '  -s SIGNAL     Send specific signal',
        exitCode: 1
      };
    }

    try {
      let signal = 'SIGTERM';
      let jobId = args[args.length - 1];

      for (let i = 0; i < args.length - 1; i++) {
        if (args[i] === '-9' || args[i] === '--kill') {
          signal = 'SIGKILL';
        } else if (args[i] === '-s' && i + 1 < args.length - 1) {
          signal = args[i + 1];
          i++;
        }
      }

      const job = await this.jobManager.killJob(jobId, signal);

      return {
        stdout: `Job ${jobId} stopped with signal ${signal}\n`,
        stderr: '',
        exitCode: 0
      };
    } catch (error) {
      return { stdout: '', stderr: `Error: ${error.message}\n`, exitCode: 1 };
    }
  }

  /**
   * job-pause - Pause a running job
   * Usage: job-pause JOB_ID
   */
  async jobPause(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (args.length === 0) {
      return { stdout: '', stderr: 'Usage: job-pause JOB_ID\n', exitCode: 1 };
    }

    try {
      const jobId = args[0];
      await this.jobManager.pauseJob(jobId);

      return { stdout: `Job ${jobId} paused\n`, stderr: '', exitCode: 0 };
    } catch (error) {
      return { stdout: '', stderr: `Error: ${error.message}\n`, exitCode: 1 };
    }
  }

  /**
   * job-resume - Resume a paused job
   * Usage: job-resume JOB_ID
   */
  async jobResume(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (args.length === 0) {
      return { stdout: '', stderr: 'Usage: job-resume JOB_ID\n', exitCode: 1 };
    }

    try {
      const jobId = args[0];
      await this.jobManager.resumeJob(jobId);

      return { stdout: `Job ${jobId} resumed\n`, stderr: '', exitCode: 0 };
    } catch (error) {
      return { stdout: '', stderr: `Error: ${error.message}\n`, exitCode: 1 };
    }
  }

  /**
   * job-remove - Remove a job
   * Usage: job-remove [OPTIONS] JOB_ID
   */
  async jobRemove(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: 'Usage: job-remove [OPTIONS] JOB_ID\n' +
               'Options:\n' +
               '  -f, --force    Force removal of running jobs',
        exitCode: 1
      };
    }

    try {
      let force = false;
      let jobId = args[args.length - 1];

      for (const arg of args.slice(0, -1)) {
        if (arg === '-f' || arg === '--force') {
          force = true;
        }
      }

      const removed = await this.jobManager.removeJob(jobId, force);

      if (removed) {
        return { stdout: `Job ${jobId} removed\n`, stderr: '', exitCode: 0 };
      } else {
        return { stdout: '', stderr: `Job ${jobId} not found\n`, exitCode: 1 };
      }
    } catch (error) {
      return { stdout: '', stderr: `Error: ${error.message}\n`, exitCode: 1 };
    }
  }

  /**
   * job-update - Update job properties
   * Usage: job-update [OPTIONS] JOB_ID
   */
  async jobUpdate(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (args.length < 2) {
      return {
        stdout: '',
        stderr: 'Usage: job-update [OPTIONS] JOB_ID\n' +
               'Options:\n' +
               '  -n, --name NAME       Change job name\n' +
               '  -p, --priority N      Change priority (-20 to 19)\n' +
               '  -d, --description D   Change description\n' +
               '  --timeout N           Change timeout in seconds\n' +
               '  --add-tag TAG         Add tag\n' +
               '  --remove-tag TAG      Remove tag',
        exitCode: 1
      };
    }

    try {
      const jobId = args[args.length - 1];
      const updates = this.parseUpdateOptions(args.slice(0, -1));

      const job = await this.jobManager.updateJob(jobId, updates);

      return { stdout: `Job ${jobId} updated successfully\n`, stderr: '', exitCode: 0 };
    } catch (error) {
      return { stdout: '', stderr: `Error: ${error.message}\n`, exitCode: 1 };
    }
  }

  /**
   * job-run - Create and immediately start a job
   * Usage: job-run [OPTIONS] COMMAND
   */
  async jobRun(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const options = this.parseCreateOptions(args);
      const command = args.slice(args.findIndex(arg => !arg.startsWith('-'))).join(' ');

      if (!command) {
        return { stdout: '', stderr: 'Usage: job-run [OPTIONS] COMMAND\n', exitCode: 1 };
      }

      const job = await this.jobManager.runJob({ ...options, command });

      return {
        stdout: `Job ${job.id} (${job.name}) started with PID ${job.pid}\n`,
        stderr: '',
        exitCode: 0
      };
    } catch (error) {
      return { stdout: '', stderr: `Error: ${error.message}\n`, exitCode: 1 };
    }
  }

  /**
   * job-monitor - Monitor job resource usage
   * Usage: job-monitor JOB_ID
   */
  async jobMonitor(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (args.length === 0) {
      return { stdout: '', stderr: 'Usage: job-monitor JOB_ID\n', exitCode: 1 };
    }

    try {
      const jobId = args[0];
      const monitoring = await this.jobManager.monitorJob(jobId);

      if (!monitoring) {
        return { stdout: '', stderr: `Job ${jobId} is not running\n`, exitCode: 1 };
      }

      let output = `Job ${jobId} Resource Usage:\n`;
      output += `  PID: ${monitoring.pid}\n`;
      output += `  CPU: ${monitoring.cpu}%\n`;
      output += `  Memory: ${monitoring.memory}%\n`;
      output += `  Elapsed: ${monitoring.elapsed}\n`;
      output += `  State: ${monitoring.state}\n`;
      output += `  Timestamp: ${monitoring.timestamp.toISOString()}\n`;

      return { stdout: output, stderr: '', exitCode: 0 };
    } catch (error) {
      return { stdout: '', stderr: `Error: ${error.message}\n`, exitCode: 1 };
    }
  }

  /**
   * job-stats - Show job statistics
   * Usage: job-stats
   */
  async jobStats(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const stats = this.jobManager.getJobStats();

      let output = 'Job Statistics:\n';
      output += `  Total Jobs: ${stats.total}\n`;
      output += `  Running: ${stats.running}\n`;
      output += `  Completed: ${stats.completed}\n`;
      output += `  Failed: ${stats.failed}\n\n`;

      output += 'By Status:\n';
      for (const [status, count] of Object.entries(stats.byStatus)) {
        output += `  ${status}: ${count}\n`;
      }

      output += '\nBy Type:\n';
      for (const [type, count] of Object.entries(stats.byType)) {
        output += `  ${type}: ${count}\n`;
      }

      return { stdout: output, stderr: '', exitCode: 0 };
    } catch (error) {
      return { stdout: '', stderr: `Error: ${error.message}\n`, exitCode: 1 };
    }
  }

  /**
   * job-cleanup - Clean up old completed jobs
   * Usage: job-cleanup [HOURS]
   */
  async jobCleanup(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const hours = args.length > 0 ? parseInt(args[0]) : 24;
      const removed = await this.jobManager.cleanupJobs(hours);

      return {
        stdout: `Cleaned up ${removed} old jobs (older than ${hours} hours)\n`,
        stderr: '',
        exitCode: 0
      };
    } catch (error) {
      return { stdout: '', stderr: `Error: ${error.message}\n`, exitCode: 1 };
    }
  }

  /**
   * ps-list - List system processes
   * Usage: ps-list [OPTIONS]
   */
  async psList(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      const processes = await this.jobManager.getSystemProcesses();

      if (processes.length === 0) {
        return { stdout: 'No processes found.\n', stderr: '', exitCode: 0 };
      }

      let output = 'PID      PPID     USER           CPU%  MEM%  STARTED              COMMAND\n';
      output += '================================================================================\n';

      const filtered = args.includes('--user')
        ? processes.filter(p => p.user === process.env.USER)
        : processes;

      const sorted = filtered.sort((a, b) => {
        if (args.includes('--cpu')) return b.cpu - a.cpu;
        if (args.includes('--memory')) return b.memory - a.memory;
        return a.pid - b.pid;
      });

      const limit = args.includes('--top') ? 20 : sorted.length;

      for (const proc of sorted.slice(0, limit)) {
        output += `${proc.pid.toString().padEnd(8)} `;
        output += `${proc.ppid.toString().padEnd(8)} `;
        output += `${proc.user.padEnd(14)} `;
        output += `${proc.cpu.toFixed(1).padStart(5)}  `;
        output += `${proc.memory.toFixed(1).padStart(5)}  `;
        output += `${proc.startTime.toLocaleString().padEnd(19)} `;
        output += `${proc.command.slice(0, 50)}\n`;
      }

      return { stdout: output, stderr: '', exitCode: 0 };
    } catch (error) {
      return { stdout: '', stderr: `Error: ${error.message}\n`, exitCode: 1 };
    }
  }

  /**
   * ps-kill - Kill a system process
   * Usage: ps-kill [OPTIONS] PID
   */
  async psKill(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (args.length === 0) {
      return {
        stdout: '',
        stderr: 'Usage: ps-kill [OPTIONS] PID\n' +
               'Options:\n' +
               '  -9, --kill    Send SIGKILL instead of SIGTERM\n' +
               '  -s SIGNAL     Send specific signal',
        exitCode: 1
      };
    }

    try {
      let signal = 'SIGTERM';
      let pidStr = args[args.length - 1];
      const pid = parseInt(pidStr);

      if (isNaN(pid)) {
        return { stdout: '', stderr: 'Invalid PID\n', exitCode: 1 };
      }

      for (let i = 0; i < args.length - 1; i++) {
        if (args[i] === '-9' || args[i] === '--kill') {
          signal = 'SIGKILL';
        } else if (args[i] === '-s' && i + 1 < args.length - 1) {
          signal = args[i + 1];
          i++;
        }
      }

      const success = await this.jobManager.killSystemProcess(pid, signal);

      if (success) {
        return { stdout: `Process ${pid} killed with signal ${signal}\n`, stderr: '', exitCode: 0 };
      } else {
        return { stdout: '', stderr: `Process ${pid} not found\n`, exitCode: 1 };
      }
    } catch (error) {
      return { stdout: '', stderr: `Error: ${error.message}\n`, exitCode: 1 };
    }
  }

  // Helper methods for parsing options and formatting output

  private parseCreateOptions(args: string[]): any {
    const options: any = { tags: [] };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '-n' || arg === '--name') {
        options.name = args[++i];
      } else if (arg === '-t' || arg === '--type') {
        options.type = args[++i];
      } else if (arg === '-p' || arg === '--priority') {
        options.priority = parseInt(args[++i]);
      } else if (arg === '-d' || arg === '--description') {
        options.description = args[++i];
      } else if (arg === '--timeout') {
        options.timeout = parseInt(args[++i]) * 1000;
      } else if (arg === '--cwd') {
        options.cwd = args[++i];
      } else if (arg === '--log') {
        options.logFile = args[++i];
      } else if (arg === '--tag') {
        options.tags.push(args[++i]);
      } else if (arg === '--schedule') {
        options.type = 'scheduled';
        options.schedule = { cron: args[++i] };
      } else if (arg === '--interval') {
        options.type = 'scheduled';
        options.schedule = { interval: parseInt(args[++i]) * 1000 };
      } else if (arg === '--start') {
        options.start = true;
      }
    }

    return options;
  }

  private parseListOptions(args: string[]): JobFilter {
    const filter: JobFilter = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--status') {
        filter.status = args[++i].split(',');
      } else if (arg === '--type') {
        filter.type = args[++i].split(',');
      } else if (arg === '--user') {
        filter.user = args[++i];
      } else if (arg === '--tag') {
        filter.tags = args[++i].split(',');
      } else if (arg === '--name') {
        filter.namePattern = new RegExp(args[++i], 'i');
      }
    }

    return filter;
  }

  private parseUpdateOptions(args: string[]): JobUpdate {
    const updates: JobUpdate = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '-n' || arg === '--name') {
        updates.name = args[++i];
      } else if (arg === '-p' || arg === '--priority') {
        updates.priority = parseInt(args[++i]);
      } else if (arg === '-d' || arg === '--description') {
        updates.description = args[++i];
      } else if (arg === '--timeout') {
        updates.timeout = parseInt(args[++i]) * 1000;
      } else if (arg === '--add-tag') {
        if (!updates.tags) updates.tags = [];
        updates.tags.push(args[++i]);
      }
    }

    return updates;
  }

  private formatJobSummary(job: JobSpec): string {
    const id = job.id.padEnd(13);
    const name = job.name.padEnd(20).slice(0, 20);
    const status = job.status.padEnd(11);
    const pid = (job.pid?.toString() || '-').padEnd(8);
    const started = job.startedAt?.toLocaleString().slice(0, 19) || 'Not started';
    const command = job.command.slice(0, 30);

    return `${id} ${name} ${status} ${pid} ${started} ${command}`;
  }

  private formatJobDetailed(job: JobSpec): string {
    let output = `Job: ${job.id}\n`;
    output += `  Name: ${job.name}\n`;
    output += `  Command: ${job.command}\n`;
    output += `  Type: ${job.type}\n`;
    output += `  Status: ${job.status}\n`;
    output += `  Priority: ${job.priority}\n`;
    output += `  Created: ${job.createdAt.toISOString()}\n`;

    if (job.startedAt) {
      output += `  Started: ${job.startedAt.toISOString()}\n`;
    }
    if (job.completedAt) {
      output += `  Completed: ${job.completedAt.toISOString()}\n`;
    }
    if (job.pid) {
      output += `  PID: ${job.pid}\n`;
    }
    if (job.cpuUsage !== undefined) {
      output += `  CPU Usage: ${job.cpuUsage}%\n`;
    }
    if (job.memoryUsage !== undefined) {
      output += `  Memory Usage: ${job.memoryUsage}%\n`;
    }
    if (job.cwd) {
      output += `  Working Dir: ${job.cwd}\n`;
    }
    if (job.logFile) {
      output += `  Log File: ${job.logFile}\n`;
    }
    if (job.tags.length > 0) {
      output += `  Tags: ${job.tags.join(', ')}\n`;
    }
    if (job.description) {
      output += `  Description: ${job.description}\n`;
    }
    if (job.schedule) {
      output += `  Schedule: ${JSON.stringify(job.schedule)}\n`;
    }

    return output;
  }
}

export default JobBuiltins;