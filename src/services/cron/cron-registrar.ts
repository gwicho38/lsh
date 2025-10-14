/**
 * Cron Command Registrar
 * Registers all cron-related CLI commands using BaseCommandRegistrar
 */

import { Command } from 'commander';
import { BaseCommandRegistrar } from '../../lib/base-command-registrar.js';

export class CronCommandRegistrar extends BaseCommandRegistrar {
  constructor() {
    super('CronService');
  }

  async register(program: Command): Promise<void> {
    const cronCmd = this.createCommand(program, 'cron', 'Cron job management with database integration');

    this.registerTemplateCommands(cronCmd);
    this.registerJobManagementCommands(cronCmd);
    this.registerReportingCommands(cronCmd);
  }

  private registerTemplateCommands(cronCmd: Command): void {
    // List templates
    this.addSubcommand(cronCmd, {
      name: 'templates',
      description: 'List available job templates',
      action: async () => {
        await this.withCronManager(async (manager) => {
          const templates = manager.listTemplates();

          this.logInfo('Available Job Templates:');
          templates.forEach(template => {
            this.logInfo(`\n  ${template.id}: ${template.name}`);
            this.logInfo(`    Description: ${template.description}`);
            this.logInfo(`    Command: ${template.command}`);
            this.logInfo(`    Schedule: ${template.schedule}`);
            this.logInfo(`    Category: ${template.category}`);
            this.logInfo(`    Tags: ${template.tags.join(', ')}`);
          });
        }, { requireRunning: false });
      }
    });

    // Create job from template
    this.addSubcommand(cronCmd, {
      name: 'create-from-template',
      description: 'Create a job from a template',
      arguments: [{ name: 'templateId', required: true }],
      options: [
        { flags: '-n, --name <name>', description: 'Custom job name' },
        { flags: '-c, --command <command>', description: 'Custom command' },
        { flags: '-s, --schedule <schedule>', description: 'Custom cron schedule' },
        { flags: '-w, --working-dir <dir>', description: 'Working directory' },
        { flags: '-e, --env <env>', description: 'Environment variables (JSON)' },
        { flags: '-t, --tags <tags>', description: 'Comma-separated tags' },
        { flags: '-p, --priority <priority>', description: 'Priority (0-10)', defaultValue: '5' }
      ],
      action: async (templateId, options) => {
        const result = await this.withCronManager(async (manager) => {
          const customizations: any = {};
          if (options.name) customizations.name = options.name;
          if (options.command) customizations.command = options.command;
          if (options.schedule) customizations.schedule = { cron: options.schedule };
          if (options.workingDir) customizations.workingDirectory = options.workingDir;
          if (options.env) customizations.environment = this.parseJSON(options.env, 'environment variables');
          if (options.tags) customizations.tags = this.parseTags(options.tags);
          if (options.priority) customizations.priority = parseInt(options.priority);

          return await manager.createJobFromTemplate(templateId, customizations);
        });

        this.logSuccess('Job created from template:');
        this.logInfo(`  Template: ${templateId}`);
        this.logInfo(`  Job ID: ${result.id}`);
        this.logInfo(`  Name: ${result.name}`);
        this.logInfo(`  Command: ${result.command}`);
        this.logInfo(`  Schedule: ${result.schedule.cron}`);
      }
    });
  }

  private registerJobManagementCommands(cronCmd: Command): void {
    // List jobs
    this.addSubcommand(cronCmd, {
      name: 'list',
      description: 'List all cron jobs',
      options: [
        { flags: '-f, --filter <filter>', description: 'Filter by status' }
      ],
      action: async (options) => {
        const jobs = await this.withCronManager(async (manager) => {
          return await manager.listJobs(options.filter ? { status: options.filter } : undefined);
        });

        this.logInfo(`Cron Jobs (${jobs.length} total):`);
        jobs.forEach(job => {
          const schedule = job.schedule?.cron || `${job.schedule?.interval}ms interval`;
          this.logInfo(`\n  ${job.id}: ${job.name}`);
          this.logInfo(`    Command: ${job.command}`);
          this.logInfo(`    Schedule: ${schedule}`);
          this.logInfo(`    Status: ${job.status}`);
          this.logInfo(`    Priority: ${job.priority}`);
          this.logInfo(`    Tags: ${job.tags?.join(', ') || 'None'}`);
        });
      }
    });

    // Get job info
    this.addSubcommand(cronCmd, {
      name: 'info',
      description: 'Get job information',
      arguments: [{ name: 'jobId', required: true }],
      action: async (jobId) => {
        const job = await this.withCronManager(async (manager) => {
          return await manager.getJob(jobId);
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
          const schedule = job.schedule.cron || `${job.schedule.interval}ms interval`;
          this.logInfo(`  Schedule: ${schedule}`);
        }
      }
    });

    // Start job
    this.addSubcommand(cronCmd, {
      name: 'start',
      description: 'Start a job',
      arguments: [{ name: 'jobId', required: true }],
      action: async (jobId) => {
        await this.withCronManager(async (manager) => {
          await manager.startJob(jobId);
        });

        this.logSuccess(`Job ${jobId} started`);
      }
    });

    // Stop job
    this.addSubcommand(cronCmd, {
      name: 'stop',
      description: 'Stop a job',
      arguments: [{ name: 'jobId', required: true }],
      options: [
        { flags: '-s, --signal <signal>', description: 'Signal to send', defaultValue: 'SIGTERM' }
      ],
      action: async (jobId, options) => {
        await this.withCronManager(async (manager) => {
          await manager.stopJob(jobId, options.signal);
        });

        this.logSuccess(`Job ${jobId} stopped with signal ${options.signal}`);
      }
    });

    // Remove job
    this.addSubcommand(cronCmd, {
      name: 'remove',
      description: 'Remove a job',
      arguments: [{ name: 'jobId', required: true }],
      options: [
        { flags: '-f, --force', description: 'Force removal', defaultValue: false }
      ],
      action: async (jobId, options) => {
        await this.withCronManager(async (manager) => {
          await manager.removeJob(jobId, options.force);
        });

        this.logSuccess(`Job ${jobId} removed`);
      }
    });
  }

  private registerReportingCommands(cronCmd: Command): void {
    // Get job report
    this.addSubcommand(cronCmd, {
      name: 'report',
      description: 'Get detailed job execution report',
      arguments: [{ name: 'jobId', required: true }],
      action: async (jobId) => {
        const report = await this.withCronManager(async (manager) => {
          return await manager.getJobReport(jobId);
        });

        this.displayJobReport(report);
      }
    });

    // Get all job reports
    this.addSubcommand(cronCmd, {
      name: 'reports',
      description: 'Get reports for all jobs',
      action: async () => {
        const reports = await this.withCronManager(async (manager) => {
          return await manager.getAllJobReports();
        });

        this.logInfo('All Job Reports:');
        reports.forEach(report => {
          this.logInfo(`\n  ${report.jobId}:`);
          this.logInfo(`    Executions: ${report.executions}`);
          this.logInfo(`    Success Rate: ${report.successRate.toFixed(1)}%`);
          this.logInfo(`    Last Execution: ${report.lastExecution?.toISOString() || 'Never'}`);
        });
      }
    });

    // Generate comprehensive report
    this.addSubcommand(cronCmd, {
      name: 'comprehensive-report',
      description: 'Generate comprehensive job report',
      action: async () => {
        const report = await this.withCronManager(async (manager) => {
          return await manager.generateComprehensiveReport();
        });

        this.logInfo(report);
      }
    });

    // Export job data
    this.addSubcommand(cronCmd, {
      name: 'export',
      description: 'Export job data',
      options: [
        { flags: '-f, --format <format>', description: 'Export format (json or csv)', defaultValue: 'json' },
        { flags: '-o, --output <file>', description: 'Output file path' }
      ],
      action: async (options) => {
        const data = await this.withCronManager(async (manager) => {
          return await manager.exportJobData(options.format as 'json' | 'csv');
        });

        if (options.output) {
          const fs = await import('fs');
          fs.writeFileSync(options.output, data);
          this.logSuccess(`Data exported to ${options.output}`);
        } else {
          this.logInfo(data);
        }
      }
    });
  }
}
