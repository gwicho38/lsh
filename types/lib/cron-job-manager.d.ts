/**
 * Cron Job Manager with Supabase Integration
 * Manages scheduled jobs with database persistence and monitoring
 */
import { CronJobSpec } from './daemon-client.js';
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
export declare class CronJobManager {
    private daemonClient;
    private databasePersistence;
    private templates;
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
    createJobFromTemplate(templateId: string, customizations?: Partial<CronJobSpec>): Promise<any>;
    /**
     * Create a custom job
     */
    createCustomJob(jobSpec: CronJobSpec): Promise<any>;
    /**
     * List all available templates
     */
    listTemplates(): CronJobTemplate[];
    /**
     * Get template by ID
     */
    getTemplate(templateId: string): CronJobTemplate | undefined;
    /**
     * List all jobs
     */
    listJobs(filter?: any): Promise<any[]>;
    /**
     * Get job execution report
     */
    getJobReport(jobId: string): Promise<JobExecutionReport>;
    /**
     * Get all job reports
     */
    getAllJobReports(): Promise<JobExecutionReport[]>;
    /**
     * Start a job
     */
    startJob(jobId: string): Promise<any>;
    /**
     * Stop a job
     */
    stopJob(jobId: string, signal?: string): Promise<any>;
    /**
     * Remove a job
     */
    removeJob(jobId: string, force?: boolean): Promise<boolean>;
    /**
     * Get job information
     */
    getJob(jobId: string): Promise<any>;
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
