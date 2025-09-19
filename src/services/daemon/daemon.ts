import { Command } from 'commander';
import DaemonClient from '../../lib/daemon-client.js';
import DatabasePersistence from '../../lib/database-persistence.js';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function init_daemon(program: Command) {
  await cmd_daemon(program);
}

async function cmd_daemon(program: Command) {
  const daemonCmd = program
    .command('daemon')
    .description('LSH daemon management commands');

  // Daemon control commands
  daemonCmd
    .command('status')
    .description('Get daemon status')
    .action(async () => {
      try {
        const client = new DaemonClient(`/tmp/lsh-job-daemon-${process.env.USER || 'user'}.sock`);
        
        if (!client.isDaemonRunning()) {
          console.log('❌ Daemon is not running');
          console.log('Start the daemon with: lsh daemon start');
          process.exit(1);
        }

        await client.connect();
        const status = await client.getStatus();
        
        console.log('✅ Daemon Status:');
        console.log(`  PID: ${status.pid}`);
        console.log(`  Uptime: ${Math.floor(status.uptime / 60)} minutes`);
        console.log(`  Memory: ${Math.round(status.memoryUsage.heapUsed / 1024 / 1024)} MB`);
        console.log(`  Jobs: ${status.jobs.total} total, ${status.jobs.running} running`);
        
        client.disconnect();
      } catch (error: any) {
        // Provide more helpful error messages
        if (error.message.includes('Permission denied')) {
          console.error('❌ ' + error.message);
        } else if (error.message.includes('not found')) {
          console.error('❌ ' + error.message);
        } else {
          console.error('❌ Failed to get daemon status:', error.message);
        }
        process.exit(1);
      }
    });

  daemonCmd
    .command('start')
    .description('Start the daemon')
    .action(async () => {
      try {
        const { spawn } = await import('child_process');
        const socketPath = `/tmp/lsh-job-daemon-${process.env.USER || 'user'}.sock`;
        const daemonProcess = spawn('node', ['dist/daemon/lshd.js', 'start', socketPath], {
          detached: true,
          stdio: 'ignore'
        });
        
        daemonProcess.unref();
        console.log('✅ Daemon started');
        console.log('Check status with: lsh daemon status');
      } catch (error) {
        console.error('❌ Failed to start daemon:', error);
        process.exit(1);
      }
    });

  daemonCmd
    .command('stop')
    .description('Stop the daemon')
    .action(async () => {
      try {
        const client = new DaemonClient(`/tmp/lsh-job-daemon-${process.env.USER || 'user'}.sock`);
        
        if (!client.isDaemonRunning()) {
          console.log('⚠️  Daemon is not running');
          return;
        }

        await client.connect();
        await client.stopDaemon();
        console.log('✅ Daemon stopped');
        
        client.disconnect();
      } catch (error) {
        console.error('❌ Failed to stop daemon:', error);
        process.exit(1);
      }
    });

  daemonCmd
    .command('restart')
    .description('Restart the daemon')
    .action(async () => {
      try {
        const client = new DaemonClient(`/tmp/lsh-job-daemon-${process.env.USER || 'user'}.sock`);

        if (client.isDaemonRunning()) {
          await client.connect();
          await client.restartDaemon();
          console.log('✅ Daemon restarted');
          client.disconnect();
        } else {
          console.log('⚠️  Daemon is not running, starting...');
          const { spawn } = await import('child_process');
          const daemonProcess = spawn('node', ['dist/daemon/lshd.js', 'start'], {
            detached: true,
            stdio: 'ignore'
          });
          daemonProcess.unref();
          console.log('✅ Daemon started');
        }
      } catch (error) {
        console.error('❌ Failed to restart daemon:', error);
        process.exit(1);
      }
    });

  daemonCmd
    .command('cleanup')
    .description('Clean up daemon processes and files')
    .option('-f, --force', 'Force cleanup without prompts')
    .action(async (options) => {
      await cleanupDaemon(options.force);
    });

  // Job management commands
  const jobCmd = daemonCmd
    .command('job')
    .description('Job management commands');

  jobCmd
    .command('create')
    .description('Create a new cron job')
    .option('-n, --name <name>', 'Job name')
    .option('-c, --command <command>', 'Command to execute')
    .option('-s, --schedule <schedule>', 'Cron schedule (e.g., "0 2 * * *")')
    .option('-i, --interval <interval>', 'Interval in milliseconds')
    .option('-d, --description <description>', 'Job description')
    .option('-w, --working-dir <dir>', 'Working directory')
    .option('-e, --env <env>', 'Environment variables (JSON)')
    .option('-t, --tags <tags>', 'Comma-separated tags')
    .option('-p, --priority <priority>', 'Priority (0-10)', '5')
    .option('--max-retries <retries>', 'Maximum retries', '3')
    .option('--timeout <timeout>', 'Timeout in milliseconds', '0')
    .option('--no-database-sync', 'Disable database synchronization')
    .action(async (options) => {
      try {
        if (!options.name || !options.command || (!options.schedule && !options.interval)) {
          console.error('❌ Missing required options: --name, --command, and (--schedule or --interval)');
          process.exit(1);
        }

        const client = new DaemonClient(`/tmp/lsh-job-daemon-${process.env.USER || 'user'}.sock`);
        
        if (!client.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await client.connect();

        const jobSpec = {
          id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: options.name,
          description: options.description,
          command: options.command,
          schedule: {
            cron: options.schedule,
            interval: options.interval ? parseInt(options.interval) : undefined,
          },
          workingDirectory: options.workingDir,
          environment: options.env ? JSON.parse(options.env) : {},
          tags: options.tags ? options.tags.split(',').map(t => t.trim()) : [],
          priority: parseInt(options.priority),
          maxRetries: parseInt(options.maxRetries),
          timeout: parseInt(options.timeout),
          databaseSync: options.databaseSync !== false,
        };

        const result = await client.createDatabaseCronJob(jobSpec);
        
        console.log('✅ Job created successfully:');
        console.log(`  ID: ${jobSpec.id}`);
        console.log(`  Name: ${jobSpec.name}`);
        console.log(`  Command: ${jobSpec.command}`);
        console.log(`  Schedule: ${jobSpec.schedule.cron || `${jobSpec.schedule.interval}ms interval`}`);
        console.log(`  Database Sync: ${jobSpec.databaseSync ? 'Enabled' : 'Disabled'}`);
        
        client.disconnect();
      } catch (error) {
        console.error('❌ Failed to create job:', error);
        process.exit(1);
      }
    });

  jobCmd
    .command('list')
    .description('List all jobs')
    .option('-f, --filter <filter>', 'Filter jobs by status')
    .action(async (options) => {
      try {
        const client = new DaemonClient(`/tmp/lsh-job-daemon-${process.env.USER || 'user'}.sock`);
        
        if (!client.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await client.connect();
        const jobs = await client.listJobs(options.filter ? { status: options.filter } : undefined);
        
        console.log(`📋 Jobs (${jobs.length} total):`);
        jobs.forEach(job => {
          const schedule = job.schedule?.cron || `${job.schedule?.interval}ms interval`;
          console.log(`  ${job.id}: ${job.name}`);
          console.log(`    Command: ${job.command}`);
          console.log(`    Schedule: ${schedule}`);
          console.log(`    Status: ${job.status}`);
          console.log(`    Priority: ${job.priority}`);
          console.log('');
        });
        
        client.disconnect();
      } catch (error) {
        console.error('❌ Failed to list jobs:', error);
        process.exit(1);
      }
    });

  jobCmd
    .command('start <jobId>')
    .description('Start a job')
    .action(async (jobId) => {
      try {
        const client = new DaemonClient(`/tmp/lsh-job-daemon-${process.env.USER || 'user'}.sock`);

        if (!client.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await client.connect();
        await client.startJob(jobId);

        console.log(`✅ Job ${jobId} started`);

        client.disconnect();
      } catch (error) {
        console.error('❌ Failed to start job:', error);
        process.exit(1);
      }
    });

  jobCmd
    .command('trigger <jobId>')
    .description('Trigger a job to run immediately (bypass schedule)')
    .action(async (jobId) => {
      try {
        const client = new DaemonClient(`/tmp/lsh-job-daemon-${process.env.USER || 'user'}.sock`);

        if (!client.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await client.connect();
        const result = await client.triggerJob(jobId);

        console.log(`🚀 Job ${jobId} triggered successfully`);
        if (result.output) {
          console.log('📄 Output:');
          console.log(result.output);
        }

        client.disconnect();
      } catch (error) {
        console.error('❌ Failed to trigger job:', error.message || error);
        process.exit(1);
      }
    });

  jobCmd
    .command('trigger-all')
    .description('Trigger all active jobs to run immediately')
    .option('-f, --filter <status>', 'Filter by job status (default: created)', 'created')
    .action(async (options) => {
      try {
        const client = new DaemonClient(`/tmp/lsh-job-daemon-${process.env.USER || 'user'}.sock`);

        if (!client.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await client.connect();
        const jobs = await client.listJobs({ status: options.filter });

        console.log(`🚀 Triggering ${jobs.length} jobs...`);

        for (const job of jobs) {
          try {
            console.log(`  ⏳ Triggering ${job.name} (${job.id})...`);
            const result = await client.triggerJob(job.id);
            console.log(`  ✅ ${job.name} completed`);
            if (result.output) {
              console.log(`  📄 Output: ${result.output.substring(0, 100)}${result.output.length > 100 ? '...' : ''}`);
            }
          } catch (error) {
            console.log(`  ❌ ${job.name} failed: ${error.message || error}`);
          }
        }

        console.log('🎉 All jobs triggered');
        client.disconnect();
      } catch (error) {
        console.error('❌ Failed to trigger jobs:', error.message || error);
        process.exit(1);
      }
    });

  jobCmd
    .command('stop <jobId>')
    .description('Stop a job')
    .option('-s, --signal <signal>', 'Signal to send', 'SIGTERM')
    .action(async (jobId, options) => {
      try {
        const client = new DaemonClient(`/tmp/lsh-job-daemon-${process.env.USER || 'user'}.sock`);
        
        if (!client.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await client.connect();
        await client.stopJob(jobId, options.signal);
        
        console.log(`✅ Job ${jobId} stopped with signal ${options.signal}`);
        
        client.disconnect();
      } catch (error) {
        console.error('❌ Failed to stop job:', error);
        process.exit(1);
      }
    });

  jobCmd
    .command('remove <jobId>')
    .description('Remove a job')
    .option('-f, --force', 'Force removal')
    .action(async (jobId, options) => {
      try {
        const client = new DaemonClient(`/tmp/lsh-job-daemon-${process.env.USER || 'user'}.sock`);
        
        if (!client.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await client.connect();
        await client.removeJob(jobId, options.force);
        
        console.log(`✅ Job ${jobId} removed`);
        
        client.disconnect();
      } catch (error) {
        console.error('❌ Failed to remove job:', error);
        process.exit(1);
      }
    });

  jobCmd
    .command('info <jobId>')
    .description('Get job information')
    .action(async (jobId) => {
      try {
        const client = new DaemonClient(`/tmp/lsh-job-daemon-${process.env.USER || 'user'}.sock`);
        
        if (!client.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await client.connect();
        const job = await client.getJob(jobId);
        
        if (!job) {
          console.log(`❌ Job ${jobId} not found`);
          process.exit(1);
        }

        console.log(`📋 Job Information: ${jobId}`);
        console.log(`  Name: ${job.name}`);
        console.log(`  Command: ${job.command}`);
        console.log(`  Status: ${job.status}`);
        console.log(`  Priority: ${job.priority}`);
        console.log(`  Working Directory: ${job.cwd}`);
        console.log(`  User: ${job.user}`);
        console.log(`  Tags: ${job.tags.join(', ')}`);
        
        if (job.schedule) {
          const schedule = job.schedule.cron || `${job.schedule.interval}ms interval`;
          console.log(`  Schedule: ${schedule}`);
        }
        
        client.disconnect();
      } catch (error) {
        console.error('❌ Failed to get job info:', error);
        process.exit(1);
      }
    });

  // Database integration commands
  const dbCmd = daemonCmd
    .command('db')
    .description('Database integration commands');

  dbCmd
    .command('history')
    .description('Get job execution history from database')
    .option('-j, --job-id <jobId>', 'Filter by job ID')
    .option('-l, --limit <limit>', 'Limit number of results', '50')
    .action(async (options) => {
      try {
        const client = new DaemonClient(`/tmp/lsh-job-daemon-${process.env.USER || 'user'}.sock`, process.env.USER || 'user');
        const jobs = await client.getJobHistory(options.jobId, parseInt(options.limit));
        
        console.log(`📊 Job History (${jobs.length} records):`);
        jobs.forEach(job => {
          const started = new Date(job.started_at).toLocaleString();
          const completed = job.completed_at ? new Date(job.completed_at).toLocaleString() : 'Running';
          console.log(`  ${job.job_id}: ${job.command}`);
          console.log(`    Started: ${started}`);
          console.log(`    Completed: ${completed}`);
          console.log(`    Status: ${job.status}`);
          console.log(`    Exit Code: ${job.exit_code || 'N/A'}`);
          console.log('');
        });
      } catch (error) {
        console.error('❌ Failed to get job history:', error);
        process.exit(1);
      }
    });

  dbCmd
    .command('stats')
    .description('Get job statistics from database')
    .option('-j, --job-id <jobId>', 'Filter by job ID')
    .action(async (options) => {
      try {
        const client = new DaemonClient(`/tmp/lsh-job-daemon-${process.env.USER || 'user'}.sock`, process.env.USER || 'user');
        const stats = await client.getJobStatistics(options.jobId);
        
        console.log('📊 Job Statistics:');
        console.log(`  Total Jobs: ${stats.totalJobs}`);
        console.log(`  Success Rate: ${stats.successRate.toFixed(1)}%`);
        console.log(`  Last Execution: ${stats.lastExecution || 'Never'}`);
        
        console.log('\n  Status Breakdown:');
        Object.entries(stats.byStatus).forEach(([status, count]) => {
          console.log(`    ${status}: ${count}`);
        });
      } catch (error) {
        console.error('❌ Failed to get job statistics:', error);
        process.exit(1);
      }
    });
}

async function cleanupDaemon(force: boolean = false): Promise<void> {
  console.log('🧹 LSH Daemon Cleanup');
  console.log('====================');
  console.log();

  try {
    // 1. Find all daemon processes
    console.log('ℹ️  Finding LSH daemon processes...');

    let daemonPids: string[] = [];
    try {
      const { stdout } = await execAsync('pgrep -f "lshd.js"');
      daemonPids = stdout.trim().split('\n').filter(pid => pid.length > 0);
    } catch (error) {
      // No processes found
    }

    if (daemonPids.length > 0) {
      console.log('Found daemon processes:');
      try {
        const { stdout } = await execAsync('ps aux | grep lshd | grep -v grep');
        console.log(stdout.split('\n').filter(line => line.trim()).map(line => `  ${line}`).join('\n'));
      } catch (error) {
        console.log(`  PIDs: ${daemonPids.join(', ')}`);
      }
      console.log();

      if (force) {
        console.log('ℹ️  Force mode: Killing daemon processes...');
        try {
          await execAsync('pkill -f "lshd.js"');
          console.log('✅ Daemon processes killed');
        } catch (error) {
          console.log('⚠️  Some processes may require manual cleanup');
        }
      } else {
        console.log('⚠️  Found running daemon processes. Use --force to kill them automatically');
        console.log('   Or manually run: pkill -f "lshd.js"');
      }
    } else {
      console.log('ℹ️  No daemon processes found');
    }

    // 2. Clean up socket files
    console.log('ℹ️  Cleaning up socket files...');
    const socketPattern = '/tmp/lsh-*daemon*.sock';

    try {
      const { stdout } = await execAsync(`find /tmp -name "lsh-*daemon*.sock" 2>/dev/null || echo ""`);
      const socketFiles = stdout.trim().split('\n').filter(file => file.length > 0);

      if (socketFiles.length > 0) {
        console.log('Found socket files:');
        socketFiles.forEach(file => console.log(`  ${file}`));

        for (const socket of socketFiles) {
          try {
            if (fs.existsSync(socket)) {
              fs.unlinkSync(socket);
              console.log(`✅ Removed: ${socket}`);
            }
          } catch (error) {
            console.log(`⚠️  Could not remove: ${socket} (${error.message})`);
          }
        }
      } else {
        console.log('ℹ️  No socket files found');
      }
    } catch (error) {
      console.log('ℹ️  No socket files found');
    }

    // 3. Clean up PID files
    console.log('ℹ️  Cleaning up PID files...');

    try {
      const { stdout } = await execAsync(`find /tmp -name "lsh-*daemon*.pid" 2>/dev/null || echo ""`);
      const pidFiles = stdout.trim().split('\n').filter(file => file.length > 0);

      if (pidFiles.length > 0) {
        console.log('Found PID files:');
        pidFiles.forEach(file => console.log(`  ${file}`));

        for (const pidFile of pidFiles) {
          try {
            if (fs.existsSync(pidFile)) {
              fs.unlinkSync(pidFile);
              console.log(`✅ Removed: ${pidFile}`);
            }
          } catch (error) {
            console.log(`⚠️  Could not remove: ${pidFile} (${error.message})`);
          }
        }
      } else {
        console.log('ℹ️  No PID files found');
      }
    } catch (error) {
      console.log('ℹ️  No PID files found');
    }

    // 4. Verify cleanup
    console.log();
    console.log('ℹ️  Verifying cleanup...');

    let remainingProcesses: string[] = [];
    try {
      const { stdout } = await execAsync('pgrep -f "lshd.js"');
      remainingProcesses = stdout.trim().split('\n').filter(pid => pid.length > 0);
    } catch (error) {
      // No processes found (good)
    }

    let remainingSockets: string[] = [];
    try {
      const { stdout } = await execAsync(`find /tmp -name "lsh-*daemon*.sock" 2>/dev/null || echo ""`);
      remainingSockets = stdout.trim().split('\n').filter(file => file.length > 0);
    } catch (error) {
      // No sockets found (good)
    }

    if (remainingProcesses.length === 0 && remainingSockets.length === 0) {
      console.log('✅ Cleanup completed successfully!');
      console.log();
      console.log('📋 Next steps:');
      console.log('  1. Start fresh daemon:  lsh daemon start');
      console.log('  2. Check status:        lsh daemon status');
      console.log('  3. View dashboard:      ./scripts/monitor-dashboard.sh');
    } else {
      console.log('⚠️  Some items may still remain:');
      if (remainingProcesses.length > 0) {
        console.log(`  Processes: ${remainingProcesses.join(', ')}`);
      }
      if (remainingSockets.length > 0) {
        console.log(`  Sockets: ${remainingSockets.join(', ')}`);
      }
      console.log();
      console.log('💡 Try running with --force for complete cleanup:');
      console.log('   lsh daemon cleanup --force');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}