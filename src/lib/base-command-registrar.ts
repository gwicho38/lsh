/**
 * Base Command Registrar
 *
 * Abstract base class for command registration to eliminate duplication in:
 * - Command setup patterns
 * - Error handling
 * - Daemon client management
 * - Output formatting
 *
 * Usage:
 * ```typescript
 * class MyCommandRegistrar extends BaseCommandRegistrar {
 *   constructor() {
 *     super('MyService');
 *   }
 *
 *   async register(program: Command): Promise<void> {
 *     const cmd = this.createCommand(program, 'mycommand', 'My command description');
 *
 *     this.addSubcommand(cmd, {
 *       name: 'list',
 *       description: 'List items',
 *       action: async () => {
 *         await this.withDaemonAction(async (client) => {
 *           const items = await client.listItems();
 *           this.logSuccess('Items:', items);
 *         });
 *       }
 *     });
 *   }
 * }
 * ```
 */

import { Command } from 'commander';
import DaemonClient from './daemon-client.js';
import CronJobManager from './cron-job-manager.js';
import { createLogger, Logger } from './logger.js';
import {
  withDaemonClient,
  withDaemonClientForUser,
  isDaemonRunning
} from './daemon-client-helper.js';

/**
 * Command action handler signature
 */
export type CommandAction = (...args: any[]) => Promise<void> | void;

/**
 * Configuration for a subcommand
 */
export interface SubcommandConfig {
  name: string;
  description: string;
  options?: Array<{
    flags: string;
    description: string;
    defaultValue?: string | boolean;
  }>;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
  action: CommandAction;
}

/**
 * Configuration for daemon-aware actions
 */
export interface DaemonActionConfig {
  requireRunning?: boolean;
  exitOnError?: boolean;
  forUser?: boolean;
}

/**
 * Base class for command registrars
 */
export abstract class BaseCommandRegistrar {
  protected logger: Logger;
  protected serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
    this.logger = createLogger(serviceName);
  }

  /**
   * Register commands with the program
   * Must be implemented by subclasses
   */
  abstract register(program: Command): Promise<void>;

  /**
   * Create a top-level command
   */
  protected createCommand(
    program: Command,
    name: string,
    description: string
  ): Command {
    return program
      .command(name)
      .description(description);
  }

  /**
   * Add a subcommand with automatic error handling
   */
  protected addSubcommand(
    parent: Command,
    config: SubcommandConfig
  ): Command {
    let cmd = parent.command(config.name).description(config.description);

    // Add arguments
    if (config.arguments) {
      config.arguments.forEach(arg => {
        const argStr = arg.required ? `<${arg.name}>` : `[${arg.name}]`;
        if (arg.description) {
          cmd = cmd.argument(argStr, arg.description);
        } else {
          cmd = cmd.argument(argStr);
        }
      });
    }

    // Add options
    if (config.options) {
      config.options.forEach(opt => {
        if (opt.defaultValue !== undefined) {
          cmd = cmd.option(opt.flags, opt.description, opt.defaultValue);
        } else {
          cmd = cmd.option(opt.flags, opt.description);
        }
      });
    }

    // Wrap action with error handling
    cmd.action(async (...args: any[]) => {
      try {
        await config.action(...args);
      } catch (error: any) {
        this.logError('Command failed', error);
        process.exit(1);
      }
    });

    return cmd;
  }

  /**
   * Execute an action with daemon client
   */
  protected async withDaemonAction<T>(
    action: (client: DaemonClient) => Promise<T>,
    config: DaemonActionConfig = {}
  ): Promise<T> {
    const {
      requireRunning = true,
      exitOnError = true,
      forUser = false
    } = config;

    const helper = forUser ? withDaemonClientForUser : withDaemonClient;

    return await helper(
      action,
      { requireRunning, exitOnError }
    );
  }

  /**
   * Execute an action with CronJobManager
   */
  protected async withCronManager<T>(
    action: (manager: CronJobManager) => Promise<T>,
    config: { requireRunning?: boolean } = {}
  ): Promise<T> {
    const { requireRunning = true } = config;
    const manager = new CronJobManager();

    if (requireRunning && !manager.isDaemonRunning()) {
      this.logError('Daemon is not running. Start it with: lsh daemon start');
      process.exit(1);
    }

    try {
      await manager.connect();
      const result = await action(manager);
      manager.disconnect();
      return result;
    } catch (error: any) {
      manager.disconnect();
      throw error;
    }
  }

  /**
   * Check if daemon is running
   */
  protected isDaemonRunning(): boolean {
    return isDaemonRunning();
  }

  /**
   * Log success message
   */
  protected logSuccess(message: string, data?: any): void {
    this.logger.info(message);
    if (data !== undefined) {
      if (typeof data === 'object' && !Array.isArray(data)) {
        Object.entries(data).forEach(([key, value]) => {
          this.logger.info(`  ${key}: ${value}`);
        });
      } else if (Array.isArray(data)) {
        data.forEach(item => {
          if (typeof item === 'object') {
            this.logger.info(`  ${JSON.stringify(item, null, 2)}`);
          } else {
            this.logger.info(`  ${item}`);
          }
        });
      } else {
        this.logger.info(`  ${data}`);
      }
    }
  }

  /**
   * Log error message
   */
  protected logError(message: string, error?: Error | any): void {
    if (error instanceof Error) {
      this.logger.error(message, error);
    } else if (error) {
      this.logger.error(`${message}: ${error}`);
    } else {
      this.logger.error(message);
    }
  }

  /**
   * Log info message
   */
  protected logInfo(message: string): void {
    this.logger.info(message);
  }

  /**
   * Log warning message
   */
  protected logWarning(message: string): void {
    this.logger.warn(message);
  }

  /**
   * Parse JSON from string with error handling
   */
  protected parseJSON<T = any>(jsonString: string, context: string = 'JSON'): T {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      throw new Error(`Invalid ${context}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse comma-separated tags
   */
  protected parseTags(tagsString: string): string[] {
    return tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }

  /**
   * Format job schedule for display
   */
  protected formatSchedule(schedule: any): string {
    if (schedule?.cron) {
      return schedule.cron;
    }
    if (schedule?.interval) {
      return `${schedule.interval}ms interval`;
    }
    return 'No schedule';
  }

  /**
   * Validate required options
   */
  protected validateRequired(
    options: Record<string, any>,
    required: string[],
    commandName: string = 'command'
  ): void {
    const missing = required.filter(key => !options[key]);
    if (missing.length > 0) {
      throw new Error(
        `Missing required options for ${commandName}: ${missing.map(k => `--${k}`).join(', ')}`
      );
    }
  }

  /**
   * Create a standardized job specification from options
   */
  protected createJobSpec(options: any): any {
    return {
      id: options.id || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: options.name,
      description: options.description,
      command: options.command,
      schedule: {
        cron: options.schedule,
        interval: options.interval ? parseInt(options.interval) : undefined,
      },
      workingDirectory: options.workingDir,
      environment: options.env ? this.parseJSON(options.env, 'environment variables') : {},
      tags: options.tags ? this.parseTags(options.tags) : [],
      priority: options.priority ? parseInt(options.priority) : 5,
      maxRetries: options.maxRetries ? parseInt(options.maxRetries) : 3,
      timeout: options.timeout ? parseInt(options.timeout) : 0,
      databaseSync: options.databaseSync !== false,
    };
  }

  /**
   * Display job information
   */
  protected displayJob(job: any): void {
    this.logInfo(`  ${job.id}: ${job.name}`);
    this.logInfo(`    Command: ${job.command}`);
    this.logInfo(`    Schedule: ${this.formatSchedule(job.schedule)}`);
    this.logInfo(`    Status: ${job.status}`);
    this.logInfo(`    Priority: ${job.priority}`);
    if (job.tags && job.tags.length > 0) {
      this.logInfo(`    Tags: ${job.tags.join(', ')}`);
    }
  }

  /**
   * Display multiple jobs
   */
  protected displayJobs(jobs: any[]): void {
    this.logInfo(`Jobs (${jobs.length} total):`);
    jobs.forEach(job => {
      this.displayJob(job);
      this.logInfo('');
    });
  }

  /**
   * Display job report
   */
  protected displayJobReport(report: any): void {
    this.logInfo(`Job Report: ${report.jobId || 'N/A'}`);
    this.logInfo(`  Executions: ${report.executions}`);
    this.logInfo(`  Successes: ${report.successes}`);
    this.logInfo(`  Failures: ${report.failures}`);
    this.logInfo(`  Success Rate: ${report.successRate.toFixed(1)}%`);
    this.logInfo(`  Average Duration: ${Math.round(report.averageDuration)}ms`);
    this.logInfo(`  Last Execution: ${report.lastExecution?.toISOString() || 'Never'}`);
    this.logInfo(`  Last Success: ${report.lastSuccess?.toISOString() || 'Never'}`);
    this.logInfo(`  Last Failure: ${report.lastFailure?.toISOString() || 'Never'}`);

    if (report.commonErrors && report.commonErrors.length > 0) {
      this.logInfo('\n  Common Errors:');
      report.commonErrors.forEach((error: any) => {
        this.logInfo(`    - ${error.error} (${error.count} times)`);
      });
    }
  }
}

export default BaseCommandRegistrar;
