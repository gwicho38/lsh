/**
 * Job Registry - Comprehensive job execution history and analytics
 * Tracks all job runs with detailed pass/failure history, output logs, and performance metrics
 *
 * REFACTORED: Now extends BaseJobManager for unified interface
 * Note: This is a read-only tracker - startJob/stopJob only record events
 */
import { BaseJobManager, BaseJobSpec } from '../lib/base-job-manager.js';
import { JobSpec } from '../lib/job-manager.js';
export interface JobExecutionRecord {
    executionId: string;
    jobId: string;
    jobName: string;
    command: string;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    status: 'running' | 'completed' | 'failed' | 'killed' | 'timeout';
    exitCode?: number;
    signal?: string;
    pid?: number;
    ppid?: number;
    stdout: string;
    stderr: string;
    outputSize: number;
    logFile?: string;
    maxMemory?: number;
    avgCpu?: number;
    diskUsage?: number;
    environment: Record<string, string>;
    workingDirectory: string;
    user: string;
    hostname: string;
    tags: string[];
    priority: number;
    scheduled: boolean;
    retryCount: number;
    parentJobId?: string;
    errorType?: string;
    errorMessage?: string;
    stackTrace?: string;
}
export interface JobStatistics {
    jobId: string;
    jobName: string;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    killedExecutions: number;
    successRate: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    totalRuntime: number;
    averageMemory: number;
    maxMemoryUsed: number;
    averageCpuUsage: number;
    lastExecution?: Date;
    lastSuccess?: Date;
    lastFailure?: Date;
    recentTrend: 'improving' | 'degrading' | 'stable';
    commonFailures: Array<{
        error: string;
        count: number;
        percentage: number;
    }>;
    failurePattern?: string;
}
export interface JobRegistryConfig {
    registryFile: string;
    maxRecordsPerJob: number;
    maxTotalRecords: number;
    compressionEnabled: boolean;
    metricsRetentionDays: number;
    outputLogDir: string;
    indexingEnabled: boolean;
}
export declare class JobRegistry extends BaseJobManager {
    private config;
    private records;
    private index;
    private statistics;
    constructor(config?: Partial<JobRegistryConfig>);
    /**
     * Record the start of a job execution
     */
    recordJobStart(job: JobSpec, executionId?: string): JobExecutionRecord;
    /**
     * Record job output (stdout/stderr)
     */
    recordJobOutput(executionId: string, type: 'stdout' | 'stderr', data: string): void;
    /**
     * Record job completion
     */
    recordJobCompletion(executionId: string, status: JobExecutionRecord['status'], exitCode?: number, signal?: string, error?: Error): void;
    /**
     * Get execution history for a job - overrides BaseJobManager
     * Returns JobExecutionRecord[] which is compatible with BaseJobExecution[]
     */
    getJobHistory(jobId: string, limit?: number): Promise<JobExecutionRecord[]>;
    /**
     * Get job statistics - overrides BaseJobManager
     * Returns JobStatistics which is compatible with BaseJobStatistics
     */
    getJobStatistics(jobId: string): Promise<JobStatistics>;
    /**
     * Get all job statistics
     */
    getAllStatistics(): JobStatistics[];
    /**
     * Search job executions
     */
    searchExecutions(criteria: {
        jobId?: string;
        status?: string[];
        startTime?: {
            from?: Date;
            to?: Date;
        };
        duration?: {
            min?: number;
            max?: number;
        };
        tags?: string[];
        user?: string;
        command?: RegExp;
        exitCode?: number[];
        limit?: number;
    }): JobExecutionRecord[];
    /**
     * Generate execution report
     */
    generateReport(options?: {
        jobId?: string;
        timeRange?: {
            from: Date;
            to: Date;
        };
        format?: 'json' | 'text' | 'csv';
    }): Promise<string>;
    /**
     * Clean old records - overrides BaseJobManager
     */
    cleanup(): Promise<void>;
    /**
     * Export registry data
     */
    export(filePath: string, format?: 'json' | 'csv'): void;
    private addRecord;
    private findRecordByExecutionId;
    private updateJobStatistics;
    private createInitialStatistics;
    private updateFailureAnalysis;
    private calculateTrend;
    private recordResourceUsage;
    private generateExecutionId;
    private generateTextReport;
    private generateCSVReport;
    private ensureLogDirectory;
    private loadRegistry;
    private saveRegistry;
    /**
     * Start job - implements BaseJobManager abstract method
     * JobRegistry is read-only, so this records the start event
     */
    startJob(jobId: string): Promise<BaseJobSpec>;
    /**
     * Stop job - implements BaseJobManager abstract method
     * JobRegistry is read-only, so this records the stop event
     */
    stopJob(jobId: string, signal?: string): Promise<BaseJobSpec>;
}
export default JobRegistry;
