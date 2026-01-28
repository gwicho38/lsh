/**
 * Cron Job Manager with Supabase Integration
 * Manages scheduled jobs with database persistence and monitoring
 *
 * REFACTORED: Now extends BaseJobManager for unified job management interface
 */
import { BaseJobManager, BaseJobSpec } from './base-job-manager.js';
import { CronJobSpec } from './daemon-client.js';
import { JobSpec } from './job-manager.js';
export interface CronJobTemplate {
    id: string;
    name: string;
    description: string;
    command: string;
    schedule: string;
    category: 'maintenance' | 'backup' | 'monitoring' | 'data-processing' | 'custom';
    tags: string[];
    environment?: Record<string, string>;
    workingDirectory?: string;
    priority?: number;
    maxRetries?: number;
    timeout?: number;
}
export interface JobExecutionReport {
    jobId: string;
    executions: number;
    successes: number;
    failures: number;
    successRate: number;
    averageDuration: number;
    lastExecution?: Date;
    lastSuccess?: Date;
    lastFailure?: Date;
    commonErrors: Array<{
        error: string;
        count: number;
    }>;
}
export declare class CronJobManager extends BaseJobManager {
    private daemonClient;
    private databasePersistence;
    private templates;
    private userId?;
    constructor(userId?: string);
    /**
     * Load predefined job templates
     */
    private loadTemplates;
    /**
     * Connect to daemon
     */
    connect(): Promise<boolean>;
    /**
     * Disconnect from daemon
     */
    disconnect(): void;
    /**
     * Create a job from template
     */
    createJobFromTemplate(templateId: string, customizations?: Partial<CronJobSpec>): Promise<JobSpec>;
    /**
     * Create a custom job
     */
    createCustomJob(jobSpec: CronJobSpec): Promise<JobSpec>;
    /**
     * List all available templates
     */
    listTemplates(): CronJobTemplate[];
    /**
     * Get template by ID
     */
    getTemplate(templateId: string): CronJobTemplate | undefined;
    /**
     * List all jobs - overrides BaseJobManager to use daemon client
     * Returns jobs from daemon rather than storage layer
     */
    listJobs(filter?: Record<string, unknown>): Promise<BaseJobSpec[]>;
    /**
     * Get job execution report
     */
    getJobReport(jobId: string): Promise<JobExecutionReport>;
    /**
     * Get all job reports
     */
    getAllJobReports(): Promise<JobExecutionReport[]>;
    /**
     * Start a job - implements BaseJobManager abstract method
     * Delegates to daemon client and updates status
     */
    startJob(jobId: string): Promise<BaseJobSpec>;
    /**
     * Stop a job - implements BaseJobManager abstract method
     * Delegates to daemon client and updates status
     */
    stopJob(jobId: string, signal?: string): Promise<BaseJobSpec>;
    /**
     * Remove a job - overrides BaseJobManager to use daemon client
     */
    removeJob(jobId: string, force?: boolean): Promise<boolean>;
    /**
     * Get job information - overrides BaseJobManager to use daemon client
     * Returns job from daemon rather than storage layer
     */
    getJob(jobId: string): Promise<BaseJobSpec | null>;
    /**
     * Get daemon status
     */
    getDaemonStatus(): Promise<any>;
    /**
     * Generate comprehensive job report
     */
    generateComprehensiveReport(): Promise<string>;
    /**
     * Export job data
     */
    exportJobData(format?: 'json' | 'csv'): Promise<string>;
    /**
     * Check if daemon is running
     */
    isDaemonRunning(): boolean;
    /**
     * Check if connected to daemon
     */
    isConnected(): boolean;
}
export default CronJobManager;
