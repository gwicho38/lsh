import { Command } from 'commander';
import CronJobManager from '../../lib/cron-job-manager.js';

export async function init_cron(program: Command) {
  await cmd_cron(program);
}

async function cmd_cron(program: Command) {
  const cronCmd = program
    .command('cron')
    .description('Cron job management with database integration');

  // Template commands
  cronCmd
    .command('templates')
    .description('List available job templates')
    .action(async () => {
      try {
        const manager = new CronJobManager();
        const templates = manager.listTemplates();
        
        console.log('📋 Available Job Templates:');
        templates.forEach(template => {
          console.log(`\n  ${template.id}: ${template.name}`);
          console.log(`    Description: ${template.description}`);
          console.log(`    Command: ${template.command}`);
          console.log(`    Schedule: ${template.schedule}`);
          console.log(`    Category: ${template.category}`);
          console.log(`    Tags: ${template.tags.join(', ')}`);
        });
      } catch (error) {
        console.error('❌ Failed to list templates:', error);
        process.exit(1);
      }
    });

  cronCmd
    .command('create-from-template <templateId>')
    .description('Create a job from a template')
    .option('-n, --name <name>', 'Custom job name')
    .option('-c, --command <command>', 'Custom command')
    .option('-s, --schedule <schedule>', 'Custom cron schedule')
    .option('-w, --working-dir <dir>', 'Working directory')
    .option('-e, --env <env>', 'Environment variables (JSON)')
    .option('-t, --tags <tags>', 'Comma-separated tags')
    .option('-p, --priority <priority>', 'Priority (0-10)', '5')
    .action(async (templateId, options) => {
      try {
        const manager = new CronJobManager();
        
        if (!manager.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await manager.connect();

        const customizations: any = {};
        if (options.name) customizations.name = options.name;
        if (options.command) customizations.command = options.command;
        if (options.schedule) customizations.schedule = { cron: options.schedule };
        if (options.workingDir) customizations.workingDirectory = options.workingDir;
        if (options.env) customizations.environment = JSON.parse(options.env);
        if (options.tags) customizations.tags = options.tags.split(',').map(t => t.trim());
        if (options.priority) customizations.priority = parseInt(options.priority);

        const result = await manager.createJobFromTemplate(templateId, customizations);
        
        console.log('✅ Job created from template:');
        console.log(`  Template: ${templateId}`);
        console.log(`  Job ID: ${result.id}`);
        console.log(`  Name: ${result.name}`);
        console.log(`  Command: ${result.command}`);
        console.log(`  Schedule: ${result.schedule.cron}`);
        
        manager.disconnect();
      } catch (error) {
        console.error('❌ Failed to create job from template:', error);
        process.exit(1);
      }
    });

  // Job management commands
  cronCmd
    .command('list')
    .description('List all cron jobs')
    .option('-f, --filter <filter>', 'Filter by status')
    .action(async (options) => {
      try {
        const manager = new CronJobManager();
        
        if (!manager.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await manager.connect();
        const jobs = await manager.listJobs(options.filter ? { status: options.filter } : undefined);
        
        console.log(`📋 Cron Jobs (${jobs.length} total):`);
        jobs.forEach(job => {
          const schedule = job.schedule?.cron || `${job.schedule?.interval}ms interval`;
          console.log(`\n  ${job.id}: ${job.name}`);
          console.log(`    Command: ${job.command}`);
          console.log(`    Schedule: ${schedule}`);
          console.log(`    Status: ${job.status}`);
          console.log(`    Priority: ${job.priority}`);
          console.log(`    Tags: ${job.tags?.join(', ') || 'None'}`);
        });
        
        manager.disconnect();
      } catch (error) {
        console.error('❌ Failed to list jobs:', error);
        process.exit(1);
      }
    });

  cronCmd
    .command('report <jobId>')
    .description('Get detailed job execution report')
    .action(async (jobId) => {
      try {
        const manager = new CronJobManager();
        
        if (!manager.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await manager.connect();
        const report = await manager.getJobReport(jobId);
        
        console.log(`📊 Job Report: ${jobId}`);
        console.log(`  Executions: ${report.executions}`);
        console.log(`  Successes: ${report.successes}`);
        console.log(`  Failures: ${report.failures}`);
        console.log(`  Success Rate: ${report.successRate.toFixed(1)}%`);
        console.log(`  Average Duration: ${Math.round(report.averageDuration)}ms`);
        console.log(`  Last Execution: ${report.lastExecution?.toISOString() || 'Never'}`);
        console.log(`  Last Success: ${report.lastSuccess?.toISOString() || 'Never'}`);
        console.log(`  Last Failure: ${report.lastFailure?.toISOString() || 'Never'}`);
        
        if (report.commonErrors.length > 0) {
          console.log('\n  Common Errors:');
          report.commonErrors.forEach(error => {
            console.log(`    - ${error.error} (${error.count} times)`);
          });
        }
        
        manager.disconnect();
      } catch (error) {
        console.error('❌ Failed to get job report:', error);
        process.exit(1);
      }
    });

  cronCmd
    .command('reports')
    .description('Get reports for all jobs')
    .action(async () => {
      try {
        const manager = new CronJobManager();
        
        if (!manager.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await manager.connect();
        const reports = await manager.getAllJobReports();
        
        console.log('📊 All Job Reports:');
        reports.forEach(report => {
          console.log(`\n  ${report.jobId}:`);
          console.log(`    Executions: ${report.executions}`);
          console.log(`    Success Rate: ${report.successRate.toFixed(1)}%`);
          console.log(`    Last Execution: ${report.lastExecution?.toISOString() || 'Never'}`);
        });
        
        manager.disconnect();
      } catch (error) {
        console.error('❌ Failed to get job reports:', error);
        process.exit(1);
      }
    });

  cronCmd
    .command('comprehensive-report')
    .description('Generate comprehensive job report')
    .action(async () => {
      try {
        const manager = new CronJobManager();
        
        if (!manager.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await manager.connect();
        const report = await manager.generateComprehensiveReport();
        
        console.log(report);
        
        manager.disconnect();
      } catch (error) {
        console.error('❌ Failed to generate comprehensive report:', error);
        process.exit(1);
      }
    });

  cronCmd
    .command('export')
    .description('Export job data')
    .option('-f, --format <format>', 'Export format (json or csv)', 'json')
    .option('-o, --output <file>', 'Output file path')
    .action(async (options) => {
      try {
        const manager = new CronJobManager();
        
        if (!manager.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await manager.connect();
        const data = await manager.exportJobData(options.format as 'json' | 'csv');
        
        if (options.output) {
          const fs = await import('fs');
          fs.writeFileSync(options.output, data);
          console.log(`✅ Data exported to ${options.output}`);
        } else {
          console.log(data);
        }
        
        manager.disconnect();
      } catch (error) {
        console.error('❌ Failed to export job data:', error);
        process.exit(1);
      }
    });

  // Job control commands
  cronCmd
    .command('start <jobId>')
    .description('Start a job')
    .action(async (jobId) => {
      try {
        const manager = new CronJobManager();
        
        if (!manager.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await manager.connect();
        await manager.startJob(jobId);
        
        console.log(`✅ Job ${jobId} started`);
        
        manager.disconnect();
      } catch (error) {
        console.error('❌ Failed to start job:', error);
        process.exit(1);
      }
    });

  cronCmd
    .command('stop <jobId>')
    .description('Stop a job')
    .option('-s, --signal <signal>', 'Signal to send', 'SIGTERM')
    .action(async (jobId, options) => {
      try {
        const manager = new CronJobManager();
        
        if (!manager.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await manager.connect();
        await manager.stopJob(jobId, options.signal);
        
        console.log(`✅ Job ${jobId} stopped with signal ${options.signal}`);
        
        manager.disconnect();
      } catch (error) {
        console.error('❌ Failed to stop job:', error);
        process.exit(1);
      }
    });

  cronCmd
    .command('remove <jobId>')
    .description('Remove a job')
    .option('-f, --force', 'Force removal')
    .action(async (jobId, options) => {
      try {
        const manager = new CronJobManager();
        
        if (!manager.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await manager.connect();
        await manager.removeJob(jobId, options.force);
        
        console.log(`✅ Job ${jobId} removed`);
        
        manager.disconnect();
      } catch (error) {
        console.error('❌ Failed to remove job:', error);
        process.exit(1);
      }
    });

  cronCmd
    .command('info <jobId>')
    .description('Get job information')
    .action(async (jobId) => {
      try {
        const manager = new CronJobManager();
        
        if (!manager.isDaemonRunning()) {
          console.error('❌ Daemon is not running. Start it with: lsh daemon start');
          process.exit(1);
        }

        await manager.connect();
        const job = await manager.getJob(jobId);
        
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
        console.log(`  Tags: ${job.tags?.join(', ') || 'None'}`);
        
        if (job.schedule) {
          const schedule = job.schedule.cron || `${job.schedule.interval}ms interval`;
          console.log(`  Schedule: ${schedule}`);
        }
        
        manager.disconnect();
      } catch (error) {
        console.error('❌ Failed to get job info:', error);
        process.exit(1);
      }
    });
}