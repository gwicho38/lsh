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
import { Logger } from './logger.js';
import { JobSpec } from './job-manager.js';
/**
 * Command action handler signature
 */
export type CommandAction = (...args: unknown[]) => Promise<void> | void;
/**
 * Schedule configuration
 */
export interface ScheduleConfig {
    cron?: string;
    interval?: number;
}
/**
 * Job specification options for creating jobs
 */
export interface JobSpecOptions {
    id?: string;
    name: string;
    description?: string;
    command: string;
    schedule?: string;
    interval?: string;
    workingDir?: string;
    env?: string;
    tags?: string;
    priority?: string;
    maxRetries?: string;
    timeout?: string;
    databaseSync?: boolean;
}
/**
 * Job report structure
 */
export interface JobReport {
    jobId?: string;
    executions: number;
    successes: number;
    failures: number;
    successRate: number;
    averageDuration: number;
    lastExecution?: Date;
    lastSuccess?: Date;
    lastFailure?: Date;
    commonErrors?: Array<{
        error: string;
        count: number;
    }>;
}
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
export declare abstract class BaseCommandRegistrar {
    protected logger: Logger;
    protected serviceName: string;
    constructor(serviceName: string);
    /**
     * Register commands with the program
     * Must be implemented by subclasses
     */
    abstract register(program: Command): Promise<void>;
    /**
     * Create a top-level command
     */
    protected createCommand(program: Command, name: string, description: string): Command;
    /**
     * Add a subcommand with automatic error handling
     */
    protected addSubcommand(parent: Command, config: SubcommandConfig): Command;
    /**
     * Execute an action with daemon client
     */
    protected withDaemonAction<T>(action: (client: DaemonClient) => Promise<T>, config?: DaemonActionConfig): Promise<T>;
    /**
     * Execute an action with CronJobManager
     */
    protected withCronManager<T>(action: (manager: CronJobManager) => Promise<T>, config?: {
        requireRunning?: boolean;
    }): Promise<T>;
    /**
     * Check if daemon is running
     */
    protected isDaemonRunning(): boolean;
    /**
     * Log success message
     */
    protected logSuccess(message: string, data?: unknown): void;
    /**
     * Log error message
     */
    protected logError(message: string, error?: Error | unknown): void;
    /**
     * Log info message
     */
    protected logInfo(message: string): void;
    /**
     * Log warning message
     */
    protected logWarning(message: string): void;
    /**
     * Parse JSON from string with error handling
     */
    protected parseJSON<T = unknown>(jsonString: string, context?: string): T;
    /**
     * Parse comma-separated tags
     */
    protected parseTags(tagsString: string): string[];
    /**
     * Format job schedule for display
     */
    protected formatSchedule(schedule: ScheduleConfig | undefined): string;
    /**
     * Validate required options
     */
    protected validateRequired(options: Record<string, unknown>, required: string[], commandName?: string): void;
    /**
     * Create a standardized job specification from options
     */
    protected createJobSpec(options: JobSpecOptions): Partial<JobSpec>;
    /**
     * Display job information
     */
    protected displayJob(job: Partial<JobSpec>): void;
    /**
     * Display multiple jobs
     */
    protected displayJobs(jobs: Array<Partial<JobSpec>>): void;
    /**
     * Display job report
     */
    protected displayJobReport(report: JobReport): void;
}
export default BaseCommandRegistrar;
