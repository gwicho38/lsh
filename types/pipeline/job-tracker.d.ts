import { Pool } from 'pg';
import { EventEmitter } from 'events';
export interface Dataset {
    id: string;
    name: string;
    path: string;
    size?: number;
    format?: string;
    [key: string]: unknown;
}
export interface Artifact {
    id: string;
    name: string;
    path: string;
    type: string;
    size?: number;
    [key: string]: unknown;
}
export interface PipelineJob {
    id?: string;
    externalId?: string;
    name: string;
    type: string;
    sourceSystem: string;
    targetSystem: string;
    status: JobStatus;
    priority: JobPriority;
    config: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    cpuRequest?: number;
    memoryRequest?: number;
    gpuRequest?: number;
    scheduledAt?: Date;
    tags?: string[];
    labels?: Record<string, string>;
    owner?: string;
    team?: string;
    createdBy?: string;
}
export interface JobExecution {
    id?: string;
    jobId: string;
    executionNumber: number;
    status: JobStatus;
    startedAt?: Date;
    completedAt?: Date;
    durationMs?: number;
    cpuUsed?: number;
    memoryUsed?: number;
    gpuUsed?: number;
    executor?: string;
    workerNode?: string;
    containerId?: string;
    inputDatasets?: Dataset[];
    outputDatasets?: Dataset[];
    artifacts?: Artifact[];
    result?: Record<string, unknown>;
    errorMessage?: string;
    errorDetails?: Record<string, unknown>;
    retryCount?: number;
    retryAfter?: Date;
    logUrl?: string;
    metrics?: Record<string, number>;
}
export declare enum JobStatus {
    PENDING = "pending",
    QUEUED = "queued",
    RUNNING = "running",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled",
    RETRYING = "retrying"
}
export declare enum JobPriority {
    LOW = "low",
    NORMAL = "normal",
    HIGH = "high",
    CRITICAL = "critical"
}
export interface JobEvent {
    type: string;
    jobId: string;
    executionId?: string;
    data: Record<string, unknown>;
    timestamp: Date;
}
export declare class JobTracker extends EventEmitter {
    private pool;
    private pollingInterval;
    constructor(pool: Pool);
    createJob(job: PipelineJob): Promise<PipelineJob>;
    getJob(jobId: string): Promise<PipelineJob | null>;
    updateJobStatus(jobId: string, status: JobStatus, errorMessage?: string): Promise<void>;
    listJobs(filters?: {
        status?: JobStatus;
        sourceSystem?: string;
        targetSystem?: string;
        owner?: string;
        team?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        jobs: PipelineJob[];
        total: number;
    }>;
    createExecution(jobId: string): Promise<JobExecution>;
    startExecution(executionId: string, executor: string, workerNode?: string): Promise<void>;
    completeExecution(executionId: string, result: Record<string, unknown>, metrics?: Record<string, number>, outputDatasets?: Dataset[]): Promise<void>;
    failExecution(executionId: string, errorMessage: string, errorDetails?: Record<string, unknown>): Promise<void>;
    private scheduleRetry;
    recordMetric(jobId: string, executionId: string | null, metricName: string, metricValue: number, metricUnit?: string, tags?: Record<string, string>): Promise<void>;
    getJobMetrics(jobId: string, metricName?: string): Promise<Record<string, unknown>[]>;
    recordEvent(eventType: string, eventSource: string, eventData: Record<string, unknown>, jobId?: string, executionId?: string): Promise<void>;
    getActiveJobs(): Promise<PipelineJob[]>;
    getJobSuccessRates(): Promise<Record<string, unknown>[]>;
    startPolling(intervalMs?: number): void;
    stopPolling(): void;
    private processRetries;
    private processScheduledJobs;
    private checkStuckJobs;
    private getNextExecutionNumber;
    private parseJobRow;
    private parseExecutionRow;
    cleanup(): Promise<void>;
}
